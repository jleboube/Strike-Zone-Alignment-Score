"""
Data Loader Module

Fetches real pitch data from MLB Statcast via pybaseball library.
Data is cached locally to avoid repeated API calls.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import pybaseball - this is required for real data
try:
    from pybaseball import statcast, statcast_batter, playerid_lookup, cache
    # Enable pybaseball caching
    cache.enable()
    PYBASEBALL_AVAILABLE = True
    logger.info("pybaseball loaded successfully - real Statcast data available")
except ImportError:
    PYBASEBALL_AVAILABLE = False
    logger.warning("pybaseball not available - install with: pip install pybaseball")

# Known pitcher MLB IDs to exclude from batter list
# This is a fallback - we'll also use the pitcher column from pitch data
PITCHER_EXCLUSION_SET = set()


class DataLoader:
    """
    Handles loading real MLB pitch data from Statcast.

    Data is fetched via pybaseball and cached locally for performance.
    """

    CACHE_FILE_PATTERN = "statcast_{year}_{month}.parquet"
    FULL_SEASON_PATTERN = "statcast_{year}_full.parquet"

    def __init__(self):
        # Use /app/data in Docker container, or ../data in local development
        if os.path.exists('/app/data'):
            self.DATA_DIR = '/app/data'
        else:
            self.DATA_DIR = os.environ.get('DATA_DIR', os.path.join(os.path.dirname(__file__), '..', 'data'))
        self._data_cache = {}
        os.makedirs(self.DATA_DIR, exist_ok=True)

    def get_data(self, year: int = 2024, batter_id: int = None,
                 use_cache: bool = True) -> pd.DataFrame:
        """
        Get pitch data - primary method for fetching data.

        Args:
            year: Season year (2015-2024 have good Statcast coverage)
            batter_id: Optional MLB player ID to filter by
            use_cache: Whether to use cached data (default True)

        Returns:
            DataFrame with pitch-level Statcast data
        """
        # Try to load from local cache first
        cache_key = f"{year}_{batter_id or 'all'}"

        if use_cache and cache_key in self._data_cache:
            logger.info(f"Returning data from memory cache: {cache_key}")
            return self._data_cache[cache_key].copy()

        # Try to load from disk cache
        if use_cache:
            cached_data = self._load_from_disk_cache(year)
            if cached_data is not None:
                # Enrich with umpire data if not already present
                cached_data = self._ensure_umpire_data(cached_data)

                if batter_id:
                    cached_data = cached_data[cached_data['batter'] == batter_id]
                self._data_cache[cache_key] = cached_data
                return cached_data.copy()

        # Fetch fresh data from Statcast
        data = self._fetch_statcast_data(year, batter_id)

        if data is not None and len(data) > 0:
            self._data_cache[cache_key] = data
            # Save full season to disk if we fetched all batters
            if batter_id is None:
                self._save_to_disk_cache(data, year)

        return data

    def _ensure_umpire_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Ensure umpire data is present in the dataframe.

        If umpire_id/umpire_name columns are missing or all zeros,
        enrich the data with umpire information from Retrosheet.
        This allows us to add umpire data to previously cached data
        without re-downloading from Statcast.
        """
        # Check if umpire data is already present and valid
        has_umpire_id = 'umpire_id' in data.columns
        has_umpire_name = 'umpire_name' in data.columns

        if has_umpire_id and has_umpire_name:
            # Check if we have actual umpire data (not all zeros/Unknown)
            valid_umpires = (data['umpire_id'] != 0).sum()
            if valid_umpires > 0:
                logger.info(f"Umpire data already present: {valid_umpires} pitches with umpire info")
                return data

        # Check if we have the columns needed to match umpires
        has_game_pk = 'game_pk' in data.columns
        has_teams = 'home_team' in data.columns and 'away_team' in data.columns

        if not has_game_pk and not has_teams:
            logger.warning("Cached data missing columns needed for umpire matching (game_pk, home_team, away_team)")
            logger.info("The cached Statcast data needs to be refreshed to include umpire data.")
            logger.info("Run: docker-compose exec api python scripts/download_data.py --force")
            logger.info("This will re-download the data with all necessary columns for umpire matching.")

            # Add placeholder umpire columns
            data['umpire_id'] = 0
            data['umpire_name'] = 'Unknown'
            return data

        logger.info("Enriching cached data with umpire information...")

        # Add umpire data
        data = self._add_umpire_data(data)

        return data

    def _fetch_statcast_data(self, year: int, batter_id: int = None) -> pd.DataFrame:
        """
        Fetch data directly from Baseball Savant via pybaseball.

        Statcast data is available from 2015-present.
        """
        if not PYBASEBALL_AVAILABLE:
            logger.error("pybaseball not available - cannot fetch real data")
            return self._generate_fallback_data()

        try:
            # Define date range for the season
            start_date = f"{year}-03-28"  # Spring training / opening day
            end_date = f"{year}-10-01"    # End of regular season

            # Adjust for current year - don't go past today
            today = datetime.now()
            if year == today.year:
                end_date = today.strftime("%Y-%m-%d")

            logger.info(f"Fetching Statcast data from {start_date} to {end_date}")

            if batter_id:
                # Fetch for specific batter
                logger.info(f"Fetching data for batter ID: {batter_id}")
                data = statcast_batter(start_date, end_date, batter_id)
            else:
                # Fetch all data - this can be large, so fetch in chunks by month
                data = self._fetch_season_in_chunks(year, start_date, end_date)

            if data is None or len(data) == 0:
                logger.warning("No data returned from Statcast")
                return self._generate_fallback_data()

            # Clean and standardize the data
            data = self._clean_statcast_data(data)

            logger.info(f"Fetched {len(data)} pitches from Statcast")
            return data

        except Exception as e:
            logger.error(f"Error fetching Statcast data: {e}")
            return self._generate_fallback_data()

    def _fetch_season_in_chunks(self, year: int, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Fetch a full season in monthly chunks to avoid timeouts.
        """
        all_data = []

        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        current = start
        while current < end:
            # Calculate month end
            if current.month == 12:
                month_end = datetime(current.year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = datetime(current.year, current.month + 1, 1) - timedelta(days=1)

            # Don't go past the end date
            if month_end > end:
                month_end = end

            chunk_start = current.strftime("%Y-%m-%d")
            chunk_end = month_end.strftime("%Y-%m-%d")

            logger.info(f"Fetching chunk: {chunk_start} to {chunk_end}")

            try:
                chunk = statcast(chunk_start, chunk_end)
                if chunk is not None and len(chunk) > 0:
                    all_data.append(chunk)
                    logger.info(f"  Got {len(chunk)} pitches")
            except Exception as e:
                logger.warning(f"  Error fetching chunk: {e}")

            # Move to next month
            current = month_end + timedelta(days=1)

        if all_data:
            return pd.concat(all_data, ignore_index=True)
        return None

    def _clean_statcast_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and standardize Statcast data.

        Note on Statcast columns:
        - 'batter': MLB ID of the batter
        - 'pitcher': MLB ID of the pitcher
        - 'player_name': Name of the PITCHER (confusingly named)
        - 'game_pk': Unique game ID that can be used to look up umpire
        - We need to create 'batter_name' from other sources or lookup
        """
        # Log available columns for debugging
        logger.info(f"Available Statcast columns: {list(data.columns)}")

        # Columns we need for SZAS calculation
        required_cols = [
            'game_date', 'game_pk', 'batter', 'pitcher', 'stand', 'p_throws',
            'plate_x', 'plate_z', 'sz_top', 'sz_bot',
            'description', 'type', 'zone', 'pitch_type',
            'release_speed', 'player_name', 'pitch_name',
            'home_team', 'away_team',
            'umpire'  # Home plate umpire name - available directly in Statcast!
        ]

        # Also grab batter name columns if available
        # In Statcast, these might be: 'batter_name', 'bat_name', or similar
        batter_name_cols = ['batter_name', 'hitter_name']
        for col in batter_name_cols:
            if col in data.columns:
                required_cols.append(col)

        # Keep only available columns
        available_cols = [c for c in required_cols if c in data.columns]
        data = data[available_cols].copy()

        # Remove rows with missing critical data
        data = data.dropna(subset=['plate_x', 'plate_z', 'description'])

        # Ensure proper data types
        data['game_date'] = pd.to_datetime(data['game_date'])
        data['batter'] = data['batter'].astype(int)
        data['pitcher'] = data['pitcher'].astype(int)
        if 'game_pk' in data.columns:
            data['game_pk'] = data['game_pk'].astype(int)

        # Add umpire data from game logs
        data = self._add_umpire_data(data)

        return data

    def _add_umpire_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Add home plate umpire information to pitch data.

        Uses MLB Stats API to look up umpire by game_pk (most reliable).
        Falls back to checking if 'umpire' column in Statcast has data.
        """
        logger.info(f"Adding umpire data. Available columns: {list(data.columns)}")

        # Strategy 1: Check if 'umpire' column has actual data (not all NaN)
        if 'umpire' in data.columns:
            # Check if column has actual values
            non_null = data['umpire'].notna().sum()
            if non_null > 0:
                logger.info(f"Using 'umpire' column from Statcast ({non_null} non-null values)")
                data['umpire_name'] = data['umpire'].astype(str).replace('nan', 'Unknown').replace('<NA>', 'Unknown').replace('', 'Unknown')

                def safe_hash(name):
                    if not name or name == 'Unknown' or name == 'nan' or name == '<NA>' or pd.isna(name):
                        return 0
                    return int(abs(hash(str(name))) % 1000000)

                data['umpire_id'] = data['umpire_name'].apply(safe_hash)
                data['umpire_id'] = data['umpire_id'].astype(int)

                valid_umpires = (data['umpire_id'] != 0).sum()
                if valid_umpires > 0:
                    logger.info(f"Found umpire data for {valid_umpires}/{len(data)} pitches")
                    return data
            else:
                logger.info("Statcast 'umpire' column is empty, using MLB Stats API")

        # Strategy 2: Use MLB Stats API to look up umpires by game_pk
        if 'game_pk' in data.columns:
            logger.info("Fetching umpire data from MLB Stats API...")
            umpire_map = self._fetch_umpires_from_mlb_api(data)

            if umpire_map is not None and len(umpire_map) > 0:
                # Merge umpire data into pitch data
                data = data.merge(
                    umpire_map[['game_pk', 'umpire_id', 'umpire_name']],
                    on='game_pk',
                    how='left'
                )

                # Fill missing values
                data['umpire_id'] = data['umpire_id'].fillna(0).astype(int)
                data['umpire_name'] = data['umpire_name'].fillna('Unknown')

                valid_umpires = (data['umpire_id'] != 0).sum()
                total = len(data)
                logger.info(f"Matched umpire data for {valid_umpires}/{total} pitches ({100*valid_umpires/total:.1f}%)")

                unique_umpires = data[data['umpire_name'] != 'Unknown']['umpire_name'].nunique()
                logger.info(f"Found {unique_umpires} unique umpires")

                return data

        # Strategy 3: Try Retrosheet game logs (fallback for older data)
        logger.info("No 'umpire' column in Statcast data, trying Retrosheet...")

        has_game_pk = 'game_pk' in data.columns
        has_home_team = 'home_team' in data.columns
        has_away_team = 'away_team' in data.columns
        has_game_date = 'game_date' in data.columns

        if not has_game_date:
            logger.warning("No game_date column - cannot add umpire data")
            data['umpire_id'] = 0
            data['umpire_name'] = 'Unknown'
            return data

        # Ensure game_date is datetime
        if not pd.api.types.is_datetime64_any_dtype(data['game_date']):
            data['game_date'] = pd.to_datetime(data['game_date'])

        # Get unique years in the data
        years = data['game_date'].dt.year.unique()

        # Load umpire data from Retrosheet game logs
        umpire_map = self._load_umpire_game_logs(years, pitch_data=data)

        if umpire_map is None or len(umpire_map) == 0:
            logger.warning("Could not load umpire data from Retrosheet")
            data['umpire_id'] = 0
            data['umpire_name'] = 'Unknown'
            return data

        logger.info(f"Umpire map columns: {list(umpire_map.columns)}")
        logger.info(f"Umpire map has {len(umpire_map)} games")

        # Match on game_pk if both have it
        if has_game_pk and 'game_pk' in umpire_map.columns:
            logger.info("Matching umpires using game_pk")
            data = data.merge(
                umpire_map[['game_pk', 'umpire_id', 'umpire_name']].drop_duplicates(),
                on='game_pk',
                how='left'
            )
        # Match on date + teams
        elif has_home_team and has_away_team and 'home_team' in umpire_map.columns:
            logger.info("Matching umpires using date + teams")
            data['game_date_str'] = data['game_date'].dt.strftime('%Y-%m-%d')
            data = data.merge(
                umpire_map[['date', 'home_team', 'away_team', 'umpire_id', 'umpire_name']].drop_duplicates(),
                left_on=['game_date_str', 'home_team', 'away_team'],
                right_on=['date', 'home_team', 'away_team'],
                how='left'
            )
            if 'game_date_str' in data.columns:
                data = data.drop(columns=['game_date_str'])
            if 'date' in data.columns:
                data = data.drop(columns=['date'])
        else:
            logger.warning("Insufficient columns for umpire matching")
            data['umpire_id'] = 0
            data['umpire_name'] = 'Unknown'
            return data

        # Fill missing umpire data
        if 'umpire_id' not in data.columns:
            data['umpire_id'] = 0
        if 'umpire_name' not in data.columns:
            data['umpire_name'] = 'Unknown'

        data['umpire_id'] = data['umpire_id'].fillna(0).astype(int)
        data['umpire_name'] = data['umpire_name'].fillna('Unknown')

        matched = (data['umpire_id'] != 0).sum()
        total = len(data)
        logger.info(f"Matched umpire data for {matched}/{total} pitches ({100*matched/total:.1f}%)")

        return data

    def _fetch_umpires_from_mlb_api(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Fetch home plate umpire data from MLB Stats API.

        Uses the game_pk from Statcast data to look up umpire assignments.
        Caches results to avoid repeated API calls.

        Returns DataFrame with: game_pk, umpire_id, umpire_name
        """
        import requests
        import time

        # Get unique game_pks
        game_pks = data['game_pk'].dropna().unique()
        logger.info(f"Fetching umpire data for {len(game_pks)} unique games...")

        # Check for cached umpire data
        cache_file = os.path.join(self.DATA_DIR, 'umpire_api_cache.parquet')
        cached_umpires = None

        if os.path.exists(cache_file):
            try:
                cached_umpires = pd.read_parquet(cache_file)
                logger.info(f"Loaded {len(cached_umpires)} cached umpire assignments")
            except Exception as e:
                logger.warning(f"Could not load umpire cache: {e}")

        # Determine which games need fetching
        if cached_umpires is not None:
            cached_game_pks = set(cached_umpires['game_pk'].tolist())
            new_game_pks = [pk for pk in game_pks if pk not in cached_game_pks]
        else:
            cached_umpires = pd.DataFrame(columns=['game_pk', 'umpire_id', 'umpire_name'])
            new_game_pks = list(game_pks)

        if not new_game_pks:
            logger.info("All umpire data found in cache")
            return cached_umpires

        logger.info(f"Fetching umpire data for {len(new_game_pks)} new games from MLB Stats API...")

        new_records = []
        failed_count = 0
        success_count = 0

        for i, game_pk in enumerate(new_game_pks):
            if i > 0 and i % 100 == 0:
                logger.info(f"  Progress: {i}/{len(new_game_pks)} games ({success_count} success, {failed_count} failed)")

            try:
                url = f'https://statsapi.mlb.com/api/v1.1/game/{int(game_pk)}/feed/live'
                response = requests.get(url, timeout=10)

                if response.status_code == 200:
                    game_data = response.json()

                    # Look for home plate umpire in officials
                    officials = game_data.get('liveData', {}).get('boxscore', {}).get('officials', [])

                    hp_umpire = None
                    for official in officials:
                        if official.get('officialType') == 'Home Plate':
                            hp_umpire = official.get('official', {})
                            break

                    if hp_umpire:
                        umpire_name = hp_umpire.get('fullName', 'Unknown')
                        # Use MLB's official ID or create hash from name
                        umpire_id = hp_umpire.get('id', abs(hash(umpire_name)) % 1000000)

                        new_records.append({
                            'game_pk': int(game_pk),
                            'umpire_id': int(umpire_id),
                            'umpire_name': umpire_name
                        })
                        success_count += 1
                    else:
                        # No home plate umpire found, add placeholder
                        new_records.append({
                            'game_pk': int(game_pk),
                            'umpire_id': 0,
                            'umpire_name': 'Unknown'
                        })
                        failed_count += 1
                else:
                    failed_count += 1

                # Rate limiting - be nice to the API
                if i > 0 and i % 50 == 0:
                    time.sleep(0.5)

            except Exception as e:
                failed_count += 1
                if failed_count < 10:
                    logger.warning(f"  Error fetching game {game_pk}: {e}")

        logger.info(f"Fetched umpire data: {success_count} success, {failed_count} failed")

        # Combine with cached data
        if new_records:
            new_df = pd.DataFrame(new_records)
            all_umpires = pd.concat([cached_umpires, new_df], ignore_index=True)
            all_umpires = all_umpires.drop_duplicates(subset=['game_pk'], keep='first')

            # Save updated cache
            try:
                all_umpires.to_parquet(cache_file, index=False)
                logger.info(f"Cached {len(all_umpires)} umpire assignments")
            except Exception as e:
                logger.warning(f"Could not save umpire cache: {e}")

            return all_umpires

        return cached_umpires

    def _load_umpire_game_logs(self, years, pitch_data: pd.DataFrame = None) -> pd.DataFrame:
        """
        Load umpire assignments from Retrosheet game logs.

        Returns DataFrame with: date, home_team, away_team, umpire_id, umpire_name
        Optionally includes game_pk if pitch_data is provided to build the mapping.
        """
        cache_file = os.path.join(self.DATA_DIR, 'umpire_game_logs.parquet')

        # Check cache first
        if os.path.exists(cache_file):
            try:
                cached = pd.read_parquet(cache_file)
                logger.info(f"Loaded {len(cached)} umpire game assignments from cache")
                return cached
            except Exception as e:
                logger.warning(f"Could not load umpire cache: {e}")

        if not PYBASEBALL_AVAILABLE:
            logger.warning("pybaseball not available - cannot load umpire data")
            return None

        try:
            from pybaseball import season_game_logs

            all_logs = []
            for year in years:
                logger.info(f"Loading {year} game logs for umpire data...")
                try:
                    logs = season_game_logs(int(year))
                    if logs is not None and len(logs) > 0:
                        all_logs.append(logs)
                        logger.info(f"  Loaded {len(logs)} games for {year}")
                except Exception as e:
                    logger.warning(f"  Could not load {year} game logs: {e}")

            if not all_logs:
                logger.warning("No game logs loaded")
                return None

            game_logs = pd.concat(all_logs, ignore_index=True)

            # Extract home plate umpire information
            # Retrosheet game logs have columns like 'HP_Umpire_Name' or 'UmpireHID'
            logger.info(f"Game log columns: {list(game_logs.columns)}")

            # Build umpire mapping - column names vary by source
            umpire_cols = [c for c in game_logs.columns if 'ump' in c.lower() or 'hp' in c.lower()]
            logger.info(f"Found umpire-related columns: {umpire_cols}")

            # Try to find the home plate umpire column
            hp_ump_col = None
            hp_ump_id_col = None
            for col in game_logs.columns:
                col_lower = col.lower()
                if 'hp' in col_lower and 'ump' in col_lower:
                    if 'id' in col_lower or 'ID' in col:
                        hp_ump_id_col = col
                    else:
                        hp_ump_col = col
                elif col_lower in ['hp_umpire_name', 'umpire_hp', 'hp_umpire']:
                    hp_ump_col = col
                elif col_lower in ['hp_umpire_id', 'umpirehid']:
                    hp_ump_id_col = col

            if hp_ump_col is None and hp_ump_id_col is None:
                # Try alternative patterns
                for col in game_logs.columns:
                    if 'umpire' in col.lower() and ('home' in col.lower() or 'hp' in col.lower() or 'plate' in col.lower()):
                        hp_ump_col = col
                        break

            if hp_ump_col is None and hp_ump_id_col is None:
                logger.warning("Could not find home plate umpire column in game logs")
                logger.info(f"Available columns: {list(game_logs.columns)[:30]}...")  # Log first 30
                return None

            # Build the umpire map
            date_col = None
            for col in ['Date', 'date', 'game_date', 'GameDate']:
                if col in game_logs.columns:
                    date_col = col
                    break

            home_col = None
            away_col = None
            for col in game_logs.columns:
                col_lower = col.lower()
                if 'home' in col_lower and ('team' in col_lower or col_lower == 'home'):
                    home_col = col
                elif 'away' in col_lower or 'visit' in col_lower:
                    away_col = col

            # Create umpire ID from name if not available
            umpire_map = pd.DataFrame()

            if date_col:
                umpire_map['date'] = pd.to_datetime(game_logs[date_col]).dt.strftime('%Y-%m-%d')

            if home_col:
                umpire_map['home_team'] = game_logs[home_col]
            if away_col:
                umpire_map['away_team'] = game_logs[away_col]

            if hp_ump_col:
                umpire_map['umpire_name'] = game_logs[hp_ump_col]
                # Create numeric ID from name hash
                umpire_map['umpire_id'] = umpire_map['umpire_name'].apply(
                    lambda x: abs(hash(str(x))) % 1000000 if pd.notna(x) else 0
                )
            elif hp_ump_id_col:
                umpire_map['umpire_id'] = game_logs[hp_ump_id_col]
                umpire_map['umpire_name'] = umpire_map['umpire_id'].astype(str)

            # Remove rows without umpire data
            umpire_map = umpire_map.dropna(subset=['umpire_name'])
            umpire_map = umpire_map[umpire_map['umpire_name'] != '']

            # If we have pitch_data with game_pk, build a mapping from (date, teams) to game_pk
            if pitch_data is not None and 'game_pk' in pitch_data.columns:
                logger.info("Building game_pk mapping from pitch data...")
                # Get unique games from pitch data
                if 'home_team' in pitch_data.columns and 'away_team' in pitch_data.columns:
                    game_pk_map = pitch_data.groupby(['game_date', 'home_team', 'away_team'])['game_pk'].first().reset_index()
                    game_pk_map['date'] = pd.to_datetime(game_pk_map['game_date']).dt.strftime('%Y-%m-%d')
                    game_pk_map = game_pk_map[['date', 'home_team', 'away_team', 'game_pk']]

                    # Merge game_pk into umpire_map
                    umpire_map = umpire_map.merge(
                        game_pk_map,
                        on=['date', 'home_team', 'away_team'],
                        how='left'
                    )
                    logger.info(f"Added game_pk to {(umpire_map['game_pk'].notna()).sum()} umpire assignments")

            # Save to cache
            if len(umpire_map) > 0:
                try:
                    umpire_map.to_parquet(cache_file, index=False)
                    logger.info(f"Cached {len(umpire_map)} umpire game assignments")
                except Exception as e:
                    logger.warning(f"Could not cache umpire data: {e}")

            return umpire_map

        except Exception as e:
            logger.error(f"Error loading umpire data: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _load_from_disk_cache(self, year: int) -> pd.DataFrame:
        """
        Load cached data from disk.
        """
        cache_file = os.path.join(self.DATA_DIR, self.FULL_SEASON_PATTERN.format(year=year))

        if os.path.exists(cache_file):
            try:
                logger.info(f"Loading cached data from {cache_file}")
                data = pd.read_parquet(cache_file)
                logger.info(f"Loaded {len(data)} pitches from cache")
                return data
            except Exception as e:
                logger.warning(f"Error loading cache file: {e}")

        # Also check for CSV format
        csv_file = cache_file.replace('.parquet', '.csv')
        if os.path.exists(csv_file):
            try:
                logger.info(f"Loading cached data from {csv_file}")
                data = pd.read_csv(csv_file)
                data['game_date'] = pd.to_datetime(data['game_date'])
                logger.info(f"Loaded {len(data)} pitches from CSV cache")
                return data
            except Exception as e:
                logger.warning(f"Error loading CSV cache: {e}")

        return None

    def _save_to_disk_cache(self, data: pd.DataFrame, year: int):
        """
        Save data to disk cache for future use.
        """
        cache_file = os.path.join(self.DATA_DIR, self.FULL_SEASON_PATTERN.format(year=year))

        try:
            # Save as parquet for efficiency
            data.to_parquet(cache_file, index=False)
            logger.info(f"Saved {len(data)} pitches to {cache_file}")
        except Exception as e:
            # Fall back to CSV if parquet fails
            csv_file = cache_file.replace('.parquet', '.csv')
            try:
                data.to_csv(csv_file, index=False)
                logger.info(f"Saved {len(data)} pitches to {csv_file}")
            except Exception as e2:
                logger.warning(f"Could not save cache: {e2}")

    def download_season_data(self, year: int = 2024, force: bool = False):
        """
        Pre-download and cache a full season of data.

        Call this at startup or via a management command to ensure
        data is available without waiting for user requests.

        Args:
            year: Season year to download
            force: Force re-download even if cache exists
        """
        cache_file = os.path.join(self.DATA_DIR, self.FULL_SEASON_PATTERN.format(year=year))

        if not force and os.path.exists(cache_file):
            logger.info(f"Cache already exists for {year}")
            return True

        logger.info(f"Downloading full {year} season data...")
        data = self._fetch_statcast_data(year, batter_id=None)

        if data is not None and len(data) > 0:
            self._save_to_disk_cache(data, year)
            return True

        return False

    def get_available_batters(self, year: int = 2024) -> pd.DataFrame:
        """
        Get list of position player batters (excluding pitchers) with their pitch counts.

        Pitchers are excluded by checking who appears in the 'pitcher' column of the data.
        This ensures we only show position players in the batter dropdown.

        IMPORTANT: In Statcast data, 'player_name' is the PITCHER's name, not the batter's.
        We need to look up batter names separately using pybaseball or use cached lookups.
        """
        data = self.get_data(year=year)

        if data is None or len(data) == 0:
            return pd.DataFrame(columns=['batter_id', 'name', 'pitch_count'])

        # Get set of all pitcher IDs from the data
        # Anyone who pitched is considered a pitcher and excluded from batter list
        pitcher_ids = set(data['pitcher'].unique())
        logger.info(f"Found {len(pitcher_ids)} unique pitchers to exclude from batter list")

        # Get all unique batter IDs, their pitch counts, and batting sides
        batter_counts = data.groupby('batter').agg({
            'plate_x': 'count',
            'stand': lambda x: list(x.unique())  # Get all batting sides used
        }).reset_index()
        batter_counts.columns = ['batter_id', 'pitch_count', 'bat_sides']

        # Determine if switch hitter (bats from both sides)
        batter_counts['is_switch_hitter'] = batter_counts['bat_sides'].apply(lambda x: len(x) > 1)

        # Exclude pitchers from the batter list
        # A position player is someone who batted but never pitched
        position_players = batter_counts[~batter_counts['batter_id'].isin(pitcher_ids)]
        logger.info(f"After excluding pitchers: {len(position_players)} position players remain")

        # Filter to batters with meaningful sample sizes (at least 100 pitches seen)
        position_players = position_players[position_players['pitch_count'] >= 100]

        # Sort by pitch count descending
        position_players = position_players.sort_values('pitch_count', ascending=False)

        # Now we need to get batter names
        # Try to use pybaseball's playerid_reverse_lookup if available
        batter_names = self._get_batter_names(position_players['batter_id'].tolist())

        # Merge names with the position players dataframe
        position_players = position_players.merge(
            batter_names,
            on='batter_id',
            how='left'
        )

        # Fill any missing names with "Player {id}"
        position_players['name'] = position_players['name'].fillna(
            position_players['batter_id'].apply(lambda x: f"Player {x}")
        )

        # Remove any duplicates
        position_players = position_players.drop_duplicates(subset=['batter_id'], keep='first')

        logger.info(f"Returning {len(position_players)} position player batters with names")

        return position_players[['batter_id', 'name', 'pitch_count', 'bat_sides', 'is_switch_hitter']]

    def _get_batter_names(self, batter_ids: list) -> pd.DataFrame:
        """
        Look up batter names from MLB IDs using pybaseball.

        Returns DataFrame with columns: batter_id, name
        """
        # Check for cached name lookups
        cache_file = os.path.join(self.DATA_DIR, 'player_names_cache.parquet')

        cached_names = None
        if os.path.exists(cache_file):
            try:
                cached_names = pd.read_parquet(cache_file)
                logger.info(f"Loaded {len(cached_names)} cached player names")
            except Exception as e:
                logger.warning(f"Could not load name cache: {e}")

        # Find which IDs we need to look up
        if cached_names is not None:
            cached_ids = set(cached_names['batter_id'].tolist())
            missing_ids = [bid for bid in batter_ids if bid not in cached_ids]
        else:
            cached_names = pd.DataFrame(columns=['batter_id', 'name'])
            missing_ids = batter_ids

        # Look up missing names using pybaseball
        if missing_ids and PYBASEBALL_AVAILABLE:
            logger.info(f"Looking up names for {len(missing_ids)} players...")
            try:
                from pybaseball import playerid_reverse_lookup

                # pybaseball expects a list of IDs
                # It returns a DataFrame with 'key_mlbam', 'name_first', 'name_last'
                lookup_result = playerid_reverse_lookup(missing_ids, key_type='mlbam')

                if lookup_result is not None and len(lookup_result) > 0:
                    new_names = pd.DataFrame({
                        'batter_id': lookup_result['key_mlbam'].astype(int),
                        'name': lookup_result['name_first'] + ' ' + lookup_result['name_last']
                    })

                    # Combine with cached names
                    cached_names = pd.concat([cached_names, new_names], ignore_index=True)
                    cached_names = cached_names.drop_duplicates(subset=['batter_id'], keep='first')

                    # Save updated cache
                    try:
                        cached_names.to_parquet(cache_file, index=False)
                        logger.info(f"Saved {len(cached_names)} player names to cache")
                    except Exception as e:
                        logger.warning(f"Could not save name cache: {e}")

            except Exception as e:
                logger.warning(f"Error looking up player names: {e}")

        # Filter to only requested IDs
        result = cached_names[cached_names['batter_id'].isin(batter_ids)]

        return result

    def get_data_summary(self, year: int = 2024) -> dict:
        """
        Get summary statistics for available data.
        """
        data = self.get_data(year=year)

        if data is None or len(data) == 0:
            return {
                'total_pitches': 0,
                'takes': 0,
                'swings': 0,
                'unique_batters': 0,
                'unique_umpires': 0,
                'data_source': 'none'
            }

        take_descriptions = ['called_strike', 'ball', 'blocked_ball', 'pitchout']
        takes = data[data['description'].isin(take_descriptions)]
        swings = data[~data['description'].isin(take_descriptions)]

        # Count unique umpires (excluding placeholder 0)
        unique_umpires = 0
        if 'umpire_id' in data.columns:
            umpire_ids = data['umpire_id'].unique()
            unique_umpires = len([u for u in umpire_ids if u != 0])

        return {
            'total_pitches': len(data),
            'takes': len(takes),
            'swings': len(swings),
            'unique_batters': data['batter'].nunique(),
            'unique_umpires': unique_umpires,
            'date_range': {
                'start': str(data['game_date'].min().date()) if 'game_date' in data.columns else None,
                'end': str(data['game_date'].max().date()) if 'game_date' in data.columns else None
            },
            'zone_stats': {
                'called_strikes': len(data[data['description'] == 'called_strike']),
                'balls': len(data[data['description'] == 'ball']),
                'swinging_strikes': len(data[data['description'] == 'swinging_strike']),
                'foul': len(data[data['description'] == 'foul']),
                'in_play': len(data[data['description'].str.contains('hit_into_play', na=False)])
            },
            'data_source': 'statcast'
        }

    def _generate_fallback_data(self) -> pd.DataFrame:
        """
        Generate minimal fallback data if Statcast is unavailable.
        This should rarely be needed.
        """
        logger.warning("Generating fallback sample data - real data unavailable")

        np.random.seed(42)
        n_pitches = 2000

        # Simplified fallback with realistic distributions
        data = {
            'game_date': pd.date_range('2024-04-01', periods=n_pitches, freq='H'),
            'batter': np.random.choice([660271, 605141, 592450, 665742, 543685], n_pitches),
            'player_name': np.random.choice(['Shohei Ohtani', 'Mookie Betts', 'Aaron Judge', 'Juan Soto', 'Freddie Freeman'], n_pitches),
            'pitcher': np.random.randint(400000, 700000, n_pitches),
            'stand': np.random.choice(['L', 'R'], n_pitches),
            'p_throws': np.random.choice(['L', 'R'], n_pitches, p=[0.27, 0.73]),
            'plate_x': np.random.normal(0, 0.5, n_pitches),
            'plate_z': np.random.normal(2.5, 0.6, n_pitches),
            'sz_top': np.random.normal(3.5, 0.2, n_pitches),
            'sz_bot': np.random.normal(1.5, 0.15, n_pitches),
            'description': np.random.choice(
                ['called_strike', 'ball', 'swinging_strike', 'foul', 'hit_into_play'],
                n_pitches, p=[0.18, 0.35, 0.10, 0.22, 0.15]
            ),
            'pitch_type': np.random.choice(['FF', 'SL', 'CH', 'CU', 'SI'], n_pitches, p=[0.35, 0.25, 0.15, 0.15, 0.10]),
            'release_speed': np.random.normal(92, 5, n_pitches),
            'umpire_id': np.random.choice([427266, 484159, 484520], n_pitches),
            'zone': np.random.randint(1, 15, n_pitches)
        }

        df = pd.DataFrame(data)
        df['type'] = df['description'].map({
            'called_strike': 'S', 'ball': 'B', 'swinging_strike': 'S',
            'foul': 'S', 'hit_into_play': 'X'
        })

        return df


# Convenience function for downloading data
def download_data(years: list = None, force: bool = False):
    """
    Download Statcast data for specified years.

    Usage:
        python -c "from data_loader import download_data; download_data([2024])"
    """
    if years is None:
        years = [2024]

    loader = DataLoader()
    for year in years:
        print(f"Downloading {year} data...")
        success = loader.download_season_data(year, force=force)
        if success:
            print(f"  Success! Data cached for {year}")
        else:
            print(f"  Failed to download {year} data")


if __name__ == "__main__":
    # When run directly, download 2024 data
    download_data([2024])

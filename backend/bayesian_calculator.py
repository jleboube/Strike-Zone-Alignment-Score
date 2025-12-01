"""
Bayesian Umpire Influence Calculator

Analyzes whether umpire strike/ball calls are influenced by batter swing behavior
within an at-bat, based on Tangotiger's research framework.

The core question: When a batter takes a borderline pitch, does the umpire's
knowledge of the batter's swing tendencies influence the call?

Three zones at play:
1. Textbook strike zone - The rulebook definition
2. Umpire called zone - What the umpire actually calls (takes only)
3. Batter swing zone - Where the batter swings (reveals their personal zone)

The Bayesian approach:
- Prior: Umpire's baseline P(strike) for a location
- Evidence: Batter's demonstrated swing behavior earlier in the at-bat
- Posterior: Does call probability change based on batter's earlier decisions?
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from scipy.stats import chi2_contingency
import warnings
import logging

try:
    from pybaseball import playerid_reverse_lookup
    PYBASEBALL_AVAILABLE = True
except ImportError:
    PYBASEBALL_AVAILABLE = False

warnings.filterwarnings('ignore')
logger = logging.getLogger(__name__)

# Cache for player names to avoid repeated lookups
_player_name_cache = {}


class BayesianInfluenceCalculator:
    """
    Calculator for Bayesian analysis of umpire influence by batter swing behavior.
    """

    # Minimum requirements
    MIN_AT_BAT_PITCHES = 4  # Only analyze at-bats with 4+ pitches
    MIN_TAKES_FOR_ANALYSIS = 20  # Need enough takes to model umpire behavior

    def __init__(self):
        self.scaler = StandardScaler()

    def analyze_batter(self, pitch_data: pd.DataFrame, batter_id: int) -> dict:
        """
        Analyze a single batter for umpire influence patterns.

        Args:
            pitch_data: Full pitch data with at-bat tracking columns
            batter_id: MLB player ID to analyze

        Returns:
            Dictionary with influence analysis results
        """
        # Filter to this batter
        batter_data = pitch_data[pitch_data['batter'] == batter_id].copy()

        if len(batter_data) == 0:
            return {'error': 'No data for batter', 'batter_id': batter_id}

        # Get batter name
        batter_name = self._get_batter_name(batter_data)

        # Ensure we have required columns
        required_cols = ['at_bat_number', 'pitch_number', 'game_pk', 'plate_x', 'plate_z', 'description']
        missing = [c for c in required_cols if c not in batter_data.columns]
        if missing:
            return {
                'error': f'Missing required columns: {missing}',
                'batter_id': batter_id,
                'batter_name': batter_name
            }

        # Create at-bat identifier (game + at_bat_number)
        batter_data['ab_id'] = batter_data['game_pk'].astype(str) + '_' + batter_data['at_bat_number'].astype(str)

        # Sort by game, at-bat, and pitch number
        batter_data = batter_data.sort_values(['game_pk', 'at_bat_number', 'pitch_number'])

        # Classify pitches
        batter_data = self._classify_pitches(batter_data)

        # Filter to at-bats with 4+ pitches
        ab_pitch_counts = batter_data.groupby('ab_id').size()
        valid_abs = ab_pitch_counts[ab_pitch_counts >= self.MIN_AT_BAT_PITCHES].index
        long_abs = batter_data[batter_data['ab_id'].isin(valid_abs)].copy()

        if len(long_abs) == 0:
            return {
                'error': 'No at-bats with 4+ pitches',
                'batter_id': batter_id,
                'batter_name': batter_name,
                'total_at_bats': batter_data['ab_id'].nunique(),
                'total_pitches': len(batter_data)
            }

        # Calculate per-at-bat swing tendency up to each pitch
        long_abs = self._calculate_cumulative_swing_rate(long_abs)

        # Analyze influence on takes (where umpire makes decision)
        takes = long_abs[long_abs['is_take'] == 1].copy()

        if len(takes) < self.MIN_TAKES_FOR_ANALYSIS:
            return {
                'error': f'Insufficient takes for analysis (need {self.MIN_TAKES_FOR_ANALYSIS}, have {len(takes)})',
                'batter_id': batter_id,
                'batter_name': batter_name,
                'total_at_bats': long_abs['ab_id'].nunique(),
                'long_at_bats': len(valid_abs),
                'total_pitches': len(long_abs)
            }

        # Run influence analysis
        influence_result = self._analyze_influence(takes)

        # Calculate zone-specific analysis
        zone_analysis = self._analyze_by_zone(takes)

        # Calculate overall batter stats
        batter_stats = self._calculate_batter_stats(batter_data, long_abs)

        return {
            'batter_id': batter_id,
            'batter_name': batter_name,
            'influence_analysis': influence_result,
            'zone_analysis': zone_analysis,
            'batter_stats': batter_stats,
            'data_summary': {
                'total_pitches': len(batter_data),
                'total_at_bats': batter_data['ab_id'].nunique(),
                'long_at_bats': len(valid_abs),
                'pitches_in_long_abs': len(long_abs),
                'takes_analyzed': len(takes)
            }
        }

    def analyze_multiple_batters(self, pitch_data: pd.DataFrame,
                                  batter_ids: list = None,
                                  top_n: int = 5) -> dict:
        """
        Analyze multiple batters and aggregate results.

        Args:
            pitch_data: Full pitch data
            batter_ids: Optional list of specific batter IDs
            top_n: If batter_ids not provided, analyze top N batters by pitch count

        Returns:
            Dictionary with multi-batter analysis results
        """
        if batter_ids is None:
            # Get top batters by pitch count
            batter_counts = pitch_data.groupby('batter').size().sort_values(ascending=False)
            batter_ids = batter_counts.head(top_n).index.tolist()

        results = []
        for batter_id in batter_ids:
            logger.info(f"Analyzing batter {batter_id}...")
            result = self.analyze_batter(pitch_data, batter_id)
            results.append(result)

        # Aggregate findings
        successful = [r for r in results if 'error' not in r]
        failed = [r for r in results if 'error' in r]

        aggregate = self._aggregate_results(successful) if successful else None

        return {
            'individual_results': results,
            'aggregate_analysis': aggregate,
            'summary': {
                'batters_analyzed': len(batter_ids),
                'successful_analyses': len(successful),
                'failed_analyses': len(failed),
                'failed_reasons': [{'batter_id': r['batter_id'], 'error': r['error']} for r in failed]
            }
        }

    def _classify_pitches(self, data: pd.DataFrame) -> pd.DataFrame:
        """Classify pitches as takes, swings, strikes, balls."""
        take_descriptions = ['called_strike', 'ball', 'blocked_ball', 'pitchout']
        swing_descriptions = ['swinging_strike', 'swinging_strike_blocked', 'foul',
                              'foul_tip', 'hit_into_play', 'hit_into_play_score',
                              'hit_into_play_no_out', 'foul_bunt', 'missed_bunt']

        data['is_take'] = data['description'].isin(take_descriptions).astype(int)
        data['is_swing'] = data['description'].isin(swing_descriptions).astype(int)
        data['is_called_strike'] = (data['description'] == 'called_strike').astype(int)
        data['is_ball'] = (data['description'] == 'ball').astype(int)

        return data

    def _calculate_cumulative_swing_rate(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate the batter's cumulative swing rate within each at-bat,
        up to (but not including) the current pitch.

        This represents what the umpire has "learned" about the batter's
        swing tendencies from observing earlier pitches in the at-bat.
        """
        # Sort to ensure proper order
        data = data.sort_values(['ab_id', 'pitch_number']).copy()

        # For each pitch, calculate swing rate from previous pitches in the AB
        def calc_prior_swing_rate(group):
            swings = group['is_swing'].values
            # Cumulative sum of swings up to (not including) current pitch
            cum_swings = np.concatenate([[0], np.cumsum(swings[:-1])])
            # Number of pitches before current one
            pitch_nums = np.arange(len(swings))
            # Prior swing rate (0 for first pitch)
            prior_rate = np.where(pitch_nums > 0, cum_swings / pitch_nums, 0.5)
            return pd.Series(prior_rate, index=group.index)

        data['prior_swing_rate'] = data.groupby('ab_id', group_keys=False).apply(calc_prior_swing_rate)

        # Also track pitch number within at-bat (1-indexed)
        data['pitch_in_ab'] = data.groupby('ab_id').cumcount() + 1

        return data

    def _analyze_influence(self, takes: pd.DataFrame) -> dict:
        """
        Core analysis: Does prior swing rate influence umpire calls?

        Uses logistic regression:
        P(called_strike) = f(location, prior_swing_rate)

        If prior_swing_rate coefficient is significant, there may be influence.
        """
        # Only analyze takes where we have prior info (not first pitch)
        analysis_data = takes[takes['pitch_in_ab'] > 1].copy()

        if len(analysis_data) < 20:
            return {
                'error': 'Insufficient data for regression analysis',
                'takes_analyzed': len(analysis_data)
            }

        # Prepare features
        # Model 1: Location only (baseline)
        X_location = analysis_data[['plate_x', 'plate_z']].values

        # Model 2: Location + prior swing rate
        X_with_swing = np.column_stack([
            X_location,
            analysis_data['prior_swing_rate'].values
        ])

        y = analysis_data['is_called_strike'].values

        try:
            # Fit baseline model (location only)
            model_baseline = LogisticRegression(max_iter=1000, C=1.0)
            model_baseline.fit(X_location, y)
            baseline_score = model_baseline.score(X_location, y)

            # Fit model with swing rate
            model_with_swing = LogisticRegression(max_iter=1000, C=1.0)
            model_with_swing.fit(X_with_swing, y)
            swing_score = model_with_swing.score(X_with_swing, y)

            # Get coefficient for swing rate
            swing_coef = model_with_swing.coef_[0][2]  # Third feature

            # Interpret the coefficient
            # Positive = higher swing rate -> more called strikes
            # Negative = higher swing rate -> fewer called strikes (umpire thinks "freeswinger took it, must be ball")
            influence_direction = 'positive' if swing_coef > 0 else 'negative'

            # Calculate odds ratio
            odds_ratio = np.exp(swing_coef)

            # Simple statistical test via accuracy improvement
            accuracy_improvement = swing_score - baseline_score

            return {
                'baseline_accuracy': round(baseline_score, 4),
                'swing_model_accuracy': round(swing_score, 4),
                'accuracy_improvement': round(accuracy_improvement, 4),
                'swing_rate_coefficient': round(swing_coef, 4),
                'odds_ratio': round(odds_ratio, 4),
                'influence_direction': influence_direction,
                'takes_analyzed': len(analysis_data),
                'interpretation': self._interpret_influence(swing_coef, odds_ratio, accuracy_improvement)
            }

        except Exception as e:
            logger.error(f"Regression analysis error: {e}")
            return {
                'error': str(e),
                'takes_analyzed': len(analysis_data)
            }

    def _analyze_by_zone(self, takes: pd.DataFrame) -> dict:
        """
        Analyze influence in different zones (inside, outside, high, low, heart).
        """
        # Define zones
        takes = takes.copy()

        # Zone classification based on plate_x and plate_z
        # Assuming average sz_top ~3.5, sz_bot ~1.5
        sz_mid = (takes['sz_top'].mean() + takes['sz_bot'].mean()) / 2 if 'sz_top' in takes.columns else 2.5

        takes['zone_type'] = 'heart'  # Default
        takes.loc[takes['plate_x'] < -0.5, 'zone_type'] = 'inside_rhh'  # Inside to RHH
        takes.loc[takes['plate_x'] > 0.5, 'zone_type'] = 'outside_rhh'  # Outside to RHH
        takes.loc[takes['plate_z'] > sz_mid + 0.5, 'zone_type'] = 'high'
        takes.loc[takes['plate_z'] < sz_mid - 0.5, 'zone_type'] = 'low'

        # Edge zone (borderline pitches where influence matters most)
        takes['is_edge'] = (
            (abs(takes['plate_x']) > 0.6) & (abs(takes['plate_x']) < 1.0) |
            (takes['plate_z'] > takes['sz_top'] - 0.3) & (takes['plate_z'] < takes['sz_top'] + 0.3) |
            (takes['plate_z'] > takes['sz_bot'] - 0.3) & (takes['plate_z'] < takes['sz_bot'] + 0.3)
        ).astype(int) if 'sz_top' in takes.columns else 0

        zone_results = {}

        # Analyze edge zone specifically (most interesting)
        edge_takes = takes[takes['is_edge'] == 1]
        if len(edge_takes) >= 15:
            edge_analysis = self._simple_influence_check(edge_takes)
            zone_results['edge'] = {
                'count': len(edge_takes),
                **edge_analysis
            }

        # Overall zone breakdown
        zone_counts = takes['zone_type'].value_counts().to_dict()
        zone_results['zone_distribution'] = zone_counts

        return zone_results

    def _simple_influence_check(self, takes: pd.DataFrame) -> dict:
        """
        Simple check: Compare called strike rate for high vs low prior swing rate.
        """
        takes = takes[takes['pitch_in_ab'] > 1].copy()  # Exclude first pitch

        if len(takes) < 10:
            return {'error': 'Insufficient data'}

        # Split by median prior swing rate
        median_rate = takes['prior_swing_rate'].median()
        high_swing = takes[takes['prior_swing_rate'] > median_rate]
        low_swing = takes[takes['prior_swing_rate'] <= median_rate]

        if len(high_swing) < 5 or len(low_swing) < 5:
            return {'error': 'Insufficient data in groups'}

        high_strike_rate = high_swing['is_called_strike'].mean()
        low_strike_rate = low_swing['is_called_strike'].mean()

        return {
            'high_swing_batters_strike_rate': round(high_strike_rate, 4),
            'low_swing_batters_strike_rate': round(low_strike_rate, 4),
            'difference': round(high_strike_rate - low_strike_rate, 4),
            'high_swing_count': len(high_swing),
            'low_swing_count': len(low_swing)
        }

    def _calculate_batter_stats(self, all_data: pd.DataFrame, long_ab_data: pd.DataFrame) -> dict:
        """Calculate overall batter statistics."""
        total_swings = all_data['is_swing'].sum() if 'is_swing' in all_data.columns else 0
        total_takes = all_data['is_take'].sum() if 'is_take' in all_data.columns else 0
        total = total_swings + total_takes

        overall_swing_rate = total_swings / total if total > 0 else 0

        # In long at-bats
        long_swings = long_ab_data['is_swing'].sum() if 'is_swing' in long_ab_data.columns else 0
        long_takes = long_ab_data['is_take'].sum() if 'is_take' in long_ab_data.columns else 0
        long_total = long_swings + long_takes

        long_swing_rate = long_swings / long_total if long_total > 0 else 0

        return {
            'overall_swing_rate': round(float(overall_swing_rate), 4),
            'long_ab_swing_rate': round(float(long_swing_rate), 4),
            'total_swings': int(total_swings),
            'total_takes': int(total_takes),
            'is_freeswinger': bool(overall_swing_rate > 0.55),  # Arbitrary threshold
            'is_patient': bool(overall_swing_rate < 0.45)
        }

    def _interpret_influence(self, coef: float, odds_ratio: float, improvement: float) -> str:
        """Generate human-readable interpretation of influence analysis."""
        interpretations = []

        # Direction
        if abs(coef) < 0.1:
            interpretations.append("Minimal evidence of umpire influence from batter swing behavior.")
        elif coef > 0:
            interpretations.append(
                f"Positive correlation: Batters with higher swing rates see MORE called strikes "
                f"(odds ratio: {odds_ratio:.2f}x)."
            )
        else:
            interpretations.append(
                f"Negative correlation: Batters with higher swing rates see FEWER called strikes "
                f"(odds ratio: {odds_ratio:.2f}x). This supports the 'freeswinger took it = must be ball' theory."
            )

        # Significance proxy
        if improvement > 0.02:
            interpretations.append("Model improvement suggests the effect may be meaningful.")
        elif improvement > 0.005:
            interpretations.append("Small model improvement - effect may exist but is subtle.")
        else:
            interpretations.append("Negligible model improvement - effect likely not meaningful.")

        return " ".join(interpretations)

    def _aggregate_results(self, results: list) -> dict:
        """Aggregate results across multiple batters."""
        if not results:
            return None

        # Collect coefficients
        coefficients = []
        odds_ratios = []
        for r in results:
            if 'influence_analysis' in r and 'swing_rate_coefficient' in r['influence_analysis']:
                coefficients.append(r['influence_analysis']['swing_rate_coefficient'])
                odds_ratios.append(r['influence_analysis']['odds_ratio'])

        if not coefficients:
            return {'error': 'No valid coefficients to aggregate'}

        avg_coef = np.mean(coefficients)
        avg_odds = np.mean(odds_ratios)
        std_coef = np.std(coefficients)

        # Classify batters
        freeswingers = [r for r in results if r.get('batter_stats', {}).get('is_freeswinger')]
        patient = [r for r in results if r.get('batter_stats', {}).get('is_patient')]

        return {
            'average_coefficient': round(avg_coef, 4),
            'coefficient_std': round(std_coef, 4),
            'average_odds_ratio': round(avg_odds, 4),
            'coefficients': coefficients,
            'n_freeswingers': len(freeswingers),
            'n_patient_batters': len(patient),
            'overall_interpretation': self._interpret_aggregate(avg_coef, std_coef)
        }

    def _interpret_aggregate(self, avg_coef: float, std_coef: float) -> str:
        """Interpret aggregate findings."""
        if abs(avg_coef) < 0.1:
            return "Across batters analyzed, there is minimal evidence that umpires are influenced by batter swing behavior."
        elif avg_coef < -0.1:
            return ("Across batters analyzed, there is evidence supporting the 'freeswinger effect': "
                    "when batters with higher swing tendencies take pitches, umpires may be more likely to call them balls.")
        else:
            return ("Across batters analyzed, there is evidence that batters with higher swing tendencies "
                    "see more called strikes, contrary to the 'freeswinger effect' hypothesis.")

    def _get_batter_name(self, data: pd.DataFrame) -> str:
        """Extract batter name from data using pybaseball lookup."""
        batter_id = int(data['batter'].iloc[0])

        # Check cache first
        if batter_id in _player_name_cache:
            return _player_name_cache[batter_id]

        # Try pybaseball lookup
        if PYBASEBALL_AVAILABLE:
            try:
                lookup = playerid_reverse_lookup([batter_id], key_type='mlbam')
                if not lookup.empty:
                    first_name = str(lookup.iloc[0].get('name_first', '')).title()
                    last_name = str(lookup.iloc[0].get('name_last', '')).title()
                    if first_name and last_name:
                        name = f"{first_name} {last_name}"
                        _player_name_cache[batter_id] = name
                        return name
            except Exception as e:
                logger.warning(f"Could not lookup player {batter_id}: {e}")

        # Fallback
        return f"Player {batter_id}"

    def get_available_batters_for_analysis(self, pitch_data: pd.DataFrame, min_long_abs: int = 10) -> pd.DataFrame:
        """
        Get batters suitable for Bayesian analysis.

        Returns batters who have enough long at-bats (4+ pitches) for meaningful analysis.
        """
        if 'at_bat_number' not in pitch_data.columns:
            return pd.DataFrame(columns=['batter_id', 'name', 'long_at_bats', 'total_pitches'])

        # Create at-bat identifier
        pitch_data = pitch_data.copy()
        pitch_data['ab_id'] = pitch_data['game_pk'].astype(str) + '_' + pitch_data['at_bat_number'].astype(str)

        # Count pitches per at-bat
        ab_sizes = pitch_data.groupby(['batter', 'ab_id']).size().reset_index(name='pitches')

        # Filter to long at-bats
        long_abs = ab_sizes[ab_sizes['pitches'] >= self.MIN_AT_BAT_PITCHES]

        # Count long at-bats per batter
        batter_long_abs = long_abs.groupby('batter').size().reset_index(name='long_at_bats')
        batter_long_abs = batter_long_abs[batter_long_abs['long_at_bats'] >= min_long_abs]

        # Get total pitches per batter
        total_pitches = pitch_data.groupby('batter').size().reset_index(name='total_pitches')

        # Merge
        result = batter_long_abs.merge(total_pitches, on='batter')
        result = result.rename(columns={'batter': 'batter_id'})

        # Sort by long at-bats
        result = result.sort_values('long_at_bats', ascending=False)

        return result

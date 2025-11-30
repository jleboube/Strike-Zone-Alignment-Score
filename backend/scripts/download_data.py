#!/usr/bin/env python3
"""
Statcast Data Download Script

Downloads and caches MLB Statcast pitch data for SZAS analysis.
Run this before starting the server to ensure data is available.

Usage:
    python scripts/download_data.py [--year YEAR] [--force] [--backup]

Examples:
    python scripts/download_data.py                    # Download 2024 data
    python scripts/download_data.py --year 2023       # Download 2023 data
    python scripts/download_data.py --year 2024 --force  # Re-download 2024 data
    python scripts/download_data.py --force --backup  # Backup existing before re-download
"""

import argparse
import sys
import os
import shutil
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_loader import DataLoader


def backup_existing_cache(data_dir: str, year: int):
    """Backup existing cache file before re-downloading."""
    cache_file = os.path.join(data_dir, f"statcast_{year}_full.parquet")
    if os.path.exists(cache_file):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = os.path.join(data_dir, f"statcast_{year}_full.backup_{timestamp}.parquet")
        print(f"  Backing up existing cache to: {backup_file}")
        shutil.copy2(cache_file, backup_file)
        return backup_file
    return None


def main():
    parser = argparse.ArgumentParser(
        description='Download MLB Statcast data for SZAS analysis'
    )
    parser.add_argument(
        '--year', '-y',
        type=int,
        default=2024,
        help='Season year to download (default: 2024)'
    )
    parser.add_argument(
        '--force', '-f',
        action='store_true',
        help='Force re-download even if cache exists'
    )
    parser.add_argument(
        '--backup', '-b',
        action='store_true',
        help='Backup existing cache before re-downloading (use with --force)'
    )
    parser.add_argument(
        '--all-recent',
        action='store_true',
        help='Download last 3 years of data (2022-2024)'
    )

    args = parser.parse_args()

    loader = DataLoader()

    if args.all_recent:
        years = [2022, 2023, 2024]
    else:
        years = [args.year]

    print("=" * 60)
    print("SZAS Statcast Data Downloader")
    print("=" * 60)
    print()

    for year in years:
        print(f"Downloading {year} season data...")
        print("-" * 40)

        # Backup existing cache if requested
        if args.force and args.backup:
            backup_existing_cache(loader.DATA_DIR, year)

        success = loader.download_season_data(year=year, force=args.force)

        if success:
            # Get summary to show what was downloaded
            summary = loader.get_data_summary(year=year)
            print(f"  Total pitches: {summary['total_pitches']:,}")
            print(f"  Unique batters: {summary['unique_batters']:,}")
            print(f"  Unique umpires: {summary['unique_umpires']:,}")
            print(f"  Takes: {summary['takes']:,}")
            print(f"  Swings: {summary['swings']:,}")
            if summary.get('date_range', {}).get('start'):
                print(f"  Date range: {summary['date_range']['start']} to {summary['date_range']['end']}")
            print(f"  Status: SUCCESS")
        else:
            print(f"  Status: FAILED")

        print()

    print("=" * 60)
    print("Download complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()

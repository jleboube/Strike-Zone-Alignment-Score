"""
Strike Zone Alignment Score (SZAS) API
A Sabermetric calculation app for strike zone analysis

Uses REAL MLB Statcast data from Baseball Savant.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import pandas as pd
from szas_calculator import SZASCalculator
from bayesian_calculator import BayesianInfluenceCalculator
from data_loader import DataLoader
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS for domain hosting
# ALLOWED_ORIGINS can be comma-separated list of origins
# Example: https://szas.example.com,https://www.szas.example.com
allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*')
if allowed_origins and allowed_origins != '*':
    origins = [origin.strip() for origin in allowed_origins.split(',')]
    logger.info(f"CORS configured for origins: {origins}")
else:
    origins = "*"
    logger.info("CORS configured for all origins (development mode)")

CORS(app, origins=origins, supports_credentials=True)

# Initialize components
calculator = SZASCalculator()
bayesian_calculator = BayesianInfluenceCalculator()
data_loader = DataLoader()

# Pre-download data on startup if configured
PRELOAD_DATA = os.environ.get('PRELOAD_DATA', 'true').lower() == 'true'
DEFAULT_YEAR = int(os.environ.get('DEFAULT_YEAR', 2025))


@app.before_request
def initialize_data():
    """Initialize data on first request if not preloaded"""
    if not hasattr(app, '_data_initialized'):
        app._data_initialized = True
        if PRELOAD_DATA:
            logger.info(f"Pre-loading {DEFAULT_YEAR} Statcast data...")
            try:
                data_loader.get_data(year=DEFAULT_YEAR)
                logger.info("Data pre-loaded successfully")
            except Exception as e:
                logger.warning(f"Could not pre-load data: {e}")


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'SZAS API',
        'version': '1.0.0',
        'data_source': 'MLB Statcast (Baseball Savant)'
    })


@app.route('/api/szas/calculate', methods=['POST'])
def calculate_szas():
    """
    Calculate SZAS for given parameters using REAL Statcast data.

    Request body:
    {
        "batter_id": int (optional - MLB player ID),
        "umpire_id": int (optional),
        "year": int (default: 2024),
        "bat_side": str (optional: 'L' or 'R')
    }
    """
    try:
        data = request.get_json() or {}

        batter_id = data.get('batter_id')
        umpire_id = data.get('umpire_id')
        year = data.get('year', DEFAULT_YEAR)
        bat_side = data.get('bat_side')

        # Load REAL pitch data from Statcast
        pitch_data = data_loader.get_data(year=year, batter_id=batter_id)

        if pitch_data is None or len(pitch_data) == 0:
            return jsonify({
                'error': 'No data available',
                'message': f'Could not load Statcast data for {year}',
            }), 500

        # Filter data
        if batter_id:
            pitch_data = pitch_data[pitch_data['batter'] == batter_id]
        if umpire_id and 'umpire_id' in pitch_data.columns:
            pitch_data = pitch_data[pitch_data['umpire_id'] == umpire_id]
        if bat_side:
            pitch_data = pitch_data[pitch_data['stand'] == bat_side]

        if len(pitch_data) < 50:
            return jsonify({
                'error': 'Insufficient data',
                'message': f'Need at least 50 pitches, found {len(pitch_data)}. Try selecting a different batter or removing filters.',
                'pitch_count': len(pitch_data)
            }), 400

        # Calculate SZAS
        result = calculator.calculate_szas(pitch_data)
        result['data_source'] = 'MLB Statcast'
        result['year'] = year

        return jsonify(result)

    except Exception as e:
        logger.error(f"SZAS calculation error: {e}")
        return jsonify({
            'error': 'Calculation error',
            'message': str(e)
        }), 500


@app.route('/api/szas/zones', methods=['POST'])
def get_zone_data():
    """
    Get zone probability surfaces for visualization using REAL data.

    Returns probability grids for each zone type.
    """
    try:
        data = request.get_json() or {}

        batter_id = data.get('batter_id')
        umpire_id = data.get('umpire_id')
        year = data.get('year', DEFAULT_YEAR)
        bat_side = data.get('bat_side')

        # Load REAL data
        pitch_data = data_loader.get_data(year=year, batter_id=batter_id)

        if pitch_data is None or len(pitch_data) == 0:
            return jsonify({
                'error': 'No data available',
                'message': f'Could not load Statcast data for {year}'
            }), 500

        # Filter data
        if batter_id:
            pitch_data = pitch_data[pitch_data['batter'] == batter_id]
        if umpire_id and 'umpire_id' in pitch_data.columns:
            pitch_data = pitch_data[pitch_data['umpire_id'] == umpire_id]
        if bat_side:
            pitch_data = pitch_data[pitch_data['stand'] == bat_side]

        # Get zone surfaces
        zones = calculator.get_zone_surfaces(pitch_data)

        return jsonify(zones)

    except Exception as e:
        logger.error(f"Zone calculation error: {e}")
        return jsonify({
            'error': 'Zone calculation error',
            'message': str(e)
        }), 500


@app.route('/api/data/batters', methods=['GET'])
def get_batters():
    """Get list of available batters from REAL Statcast data"""
    try:
        year = request.args.get('year', DEFAULT_YEAR, type=int)
        batters = data_loader.get_available_batters(year=year)

        # Return top 100 batters by pitch count
        batters = batters.head(100)

        return jsonify(batters.to_dict(orient='records'))
    except Exception as e:
        logger.error(f"Error getting batters: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/data/batter/<int:batter_id>', methods=['GET'])
def get_batter_info(batter_id):
    """Get detailed info about a specific batter including their batting sides"""
    try:
        year = request.args.get('year', DEFAULT_YEAR, type=int)
        pitch_data = data_loader.get_data(year=year)

        if pitch_data is None:
            return jsonify({'error': 'No data available'}), 404

        # Filter to this batter
        batter_data = pitch_data[pitch_data['batter'] == batter_id]

        if len(batter_data) == 0:
            return jsonify({'error': 'Batter not found'}), 404

        # Get batting sides this batter uses
        bat_sides = batter_data['stand'].unique().tolist()
        is_switch_hitter = len(bat_sides) > 1

        # Get batter name
        name = batter_data['player_name'].iloc[0] if 'player_name' in batter_data.columns else 'Unknown'

        # Get pitch counts per side
        side_counts = batter_data.groupby('stand').size().to_dict()

        return jsonify({
            'batter_id': batter_id,
            'name': name,
            'bat_sides': sorted(bat_sides),
            'is_switch_hitter': is_switch_hitter,
            'pitch_count': len(batter_data),
            'pitches_by_side': side_counts
        })

    except Exception as e:
        logger.error(f"Error getting batter info: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/data/umpires', methods=['GET'])
def get_umpires():
    """Get list of available home plate umpires with their pitch counts"""
    try:
        year = request.args.get('year', DEFAULT_YEAR, type=int)
        pitch_data = data_loader.get_data(year=year)

        if pitch_data is None:
            return jsonify([])

        if 'umpire_id' not in pitch_data.columns or 'umpire_name' not in pitch_data.columns:
            logger.warning("Umpire data not available in pitch data")
            return jsonify([])

        # Group by umpire and get counts with names
        umpires = pitch_data.groupby(['umpire_id', 'umpire_name']).agg({
            'plate_x': 'count'
        }).reset_index()
        umpires.columns = ['umpire_id', 'name', 'pitch_count']

        # Filter out placeholder/unknown umpires
        umpires = umpires[umpires['umpire_id'] != 0]
        umpires = umpires[umpires['name'] != 'Unknown']
        umpires = umpires[umpires['name'].notna()]

        # Sort by pitch count (most active umpires first)
        umpires = umpires.sort_values('pitch_count', ascending=False)

        # Return top 100 umpires
        umpires = umpires.head(100)

        logger.info(f"Returning {len(umpires)} umpires")
        return jsonify(umpires.to_dict(orient='records'))

    except Exception as e:
        logger.error(f"Error getting umpires: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/data/summary', methods=['GET'])
def get_data_summary():
    """Get summary statistics of available REAL data"""
    try:
        year = request.args.get('year', DEFAULT_YEAR, type=int)
        summary = data_loader.get_data_summary(year=year)
        return jsonify(summary)
    except Exception as e:
        logger.error(f"Error getting summary: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/data/pitch-count', methods=['GET'])
def get_pitch_count():
    """
    Get pitch count for current filter combination.
    Used to preview if there's enough data before calculating SZAS.
    """
    try:
        year = request.args.get('year', DEFAULT_YEAR, type=int)
        batter_id = request.args.get('batter_id', type=int)
        umpire_id = request.args.get('umpire_id', type=int)
        bat_side = request.args.get('bat_side')

        pitch_data = data_loader.get_data(year=year, batter_id=batter_id)

        if pitch_data is None or len(pitch_data) == 0:
            return jsonify({
                'pitch_count': 0,
                'sufficient': False,
                'minimum_required': 50
            })

        # Apply filters
        if batter_id:
            pitch_data = pitch_data[pitch_data['batter'] == batter_id]
        if umpire_id and 'umpire_id' in pitch_data.columns:
            pitch_data = pitch_data[pitch_data['umpire_id'] == umpire_id]
        if bat_side:
            pitch_data = pitch_data[pitch_data['stand'] == bat_side]

        count = len(pitch_data)
        return jsonify({
            'pitch_count': count,
            'sufficient': count >= 50,
            'minimum_required': 50
        })

    except Exception as e:
        logger.error(f"Error getting pitch count: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/data/download', methods=['POST'])
def download_data():
    """
    Trigger download of Statcast data for a specific year.

    Request body:
    {
        "year": int (required),
        "force": bool (optional - re-download even if cached)
    }
    """
    try:
        data = request.get_json() or {}
        year = data.get('year', DEFAULT_YEAR)
        force = data.get('force', False)

        logger.info(f"Downloading data for {year} (force={force})")
        success = data_loader.download_season_data(year=year, force=force)

        if success:
            return jsonify({
                'status': 'success',
                'message': f'Data for {year} downloaded and cached',
                'year': year
            })
        else:
            return jsonify({
                'status': 'failed',
                'message': f'Could not download data for {year}'
            }), 500

    except Exception as e:
        logger.error(f"Error downloading data: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/data/years', methods=['GET'])
def get_available_years():
    """Get list of years with available Statcast data"""
    # Statcast data is available from 2015-present
    current_year = pd.Timestamp.now().year
    years = list(range(2015, current_year + 1))

    return jsonify({
        'years': years,
        'default': DEFAULT_YEAR,
        'note': 'Statcast data available from 2015-present'
    })


# =============================================================================
# Bayesian Umpire Influence Analysis Endpoints
# =============================================================================

@app.route('/api/bayesian/analyze', methods=['POST'])
def bayesian_analyze():
    """
    Run Bayesian umpire influence analysis on selected batters.

    Request body:
    {
        "batter_ids": [int] (optional - list of MLB player IDs),
        "top_n": int (optional - analyze top N batters if batter_ids not provided, default 5),
        "year": int (default: 2025)
    }

    Returns analysis of whether umpire calls are influenced by batter swing behavior.
    """
    try:
        data = request.get_json() or {}

        batter_ids = data.get('batter_ids')
        top_n = data.get('top_n', 5)
        year = data.get('year', DEFAULT_YEAR)

        # Load pitch data
        pitch_data = data_loader.get_data(year=year)

        if pitch_data is None or len(pitch_data) == 0:
            return jsonify({
                'error': 'No data available',
                'message': f'Could not load Statcast data for {year}'
            }), 500

        # Check if we have required columns for Bayesian analysis
        if 'at_bat_number' not in pitch_data.columns:
            return jsonify({
                'error': 'Data missing required columns',
                'message': 'Cached data does not include at-bat tracking columns. Please re-download the data.',
                'missing_columns': ['at_bat_number', 'pitch_number']
            }), 400

        # Run analysis
        logger.info(f"Running Bayesian analysis for year {year}, top_n={top_n}")
        result = bayesian_calculator.analyze_multiple_batters(
            pitch_data,
            batter_ids=batter_ids,
            top_n=top_n
        )

        result['year'] = year
        result['data_source'] = 'MLB Statcast'

        return jsonify(result)

    except Exception as e:
        logger.error(f"Bayesian analysis error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Analysis error',
            'message': str(e)
        }), 500


@app.route('/api/bayesian/analyze-batter/<int:batter_id>', methods=['GET'])
def bayesian_analyze_single(batter_id):
    """
    Run Bayesian analysis on a single batter.

    URL params:
        batter_id: MLB player ID
        year: Season year (default: 2025)
    """
    try:
        year = request.args.get('year', DEFAULT_YEAR, type=int)

        pitch_data = data_loader.get_data(year=year)

        if pitch_data is None or len(pitch_data) == 0:
            return jsonify({
                'error': 'No data available',
                'message': f'Could not load Statcast data for {year}'
            }), 500

        if 'at_bat_number' not in pitch_data.columns:
            return jsonify({
                'error': 'Data missing required columns',
                'message': 'Please re-download data to include at-bat tracking columns.'
            }), 400

        result = bayesian_calculator.analyze_batter(pitch_data, batter_id)
        result['year'] = year

        return jsonify(result)

    except Exception as e:
        logger.error(f"Bayesian single batter analysis error: {e}")
        return jsonify({
            'error': 'Analysis error',
            'message': str(e)
        }), 500


@app.route('/api/bayesian/batters', methods=['GET'])
def bayesian_get_batters():
    """
    Get list of batters suitable for Bayesian analysis.

    Only returns batters with sufficient long at-bats (4+ pitches).
    """
    try:
        year = request.args.get('year', DEFAULT_YEAR, type=int)
        min_long_abs = request.args.get('min_long_abs', 10, type=int)

        pitch_data = data_loader.get_data(year=year)

        if pitch_data is None or len(pitch_data) == 0:
            return jsonify([])

        if 'at_bat_number' not in pitch_data.columns:
            return jsonify({
                'error': 'Data missing required columns',
                'message': 'Please re-download data to include at-bat tracking columns.'
            }), 400

        batters = bayesian_calculator.get_available_batters_for_analysis(
            pitch_data,
            min_long_abs=min_long_abs
        )

        # Merge with batter names from main batter list
        all_batters = data_loader.get_available_batters(year=year)
        if 'name' in all_batters.columns:
            batters = batters.merge(
                all_batters[['batter_id', 'name']],
                on='batter_id',
                how='left'
            )
            batters['name'] = batters['name'].fillna(batters['batter_id'].apply(lambda x: f'Player {x}'))

        # Return top 50
        batters = batters.head(50)

        return jsonify(batters.to_dict(orient='records'))

    except Exception as e:
        logger.error(f"Error getting Bayesian batters: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/bayesian/status', methods=['GET'])
def bayesian_status():
    """
    Check if Bayesian analysis is available (data has required columns).
    """
    try:
        year = request.args.get('year', DEFAULT_YEAR, type=int)

        pitch_data = data_loader.get_data(year=year)

        if pitch_data is None or len(pitch_data) == 0:
            return jsonify({
                'available': False,
                'reason': 'No data loaded',
                'year': year
            })

        has_at_bat = 'at_bat_number' in pitch_data.columns
        has_pitch_num = 'pitch_number' in pitch_data.columns

        if not has_at_bat or not has_pitch_num:
            return jsonify({
                'available': False,
                'reason': 'Data missing at-bat tracking columns. Re-download required.',
                'year': year,
                'has_at_bat_number': has_at_bat,
                'has_pitch_number': has_pitch_num
            })

        return jsonify({
            'available': True,
            'year': year,
            'total_pitches': len(pitch_data),
            'columns_present': ['at_bat_number', 'pitch_number']
        })

    except Exception as e:
        logger.error(f"Error checking Bayesian status: {e}")
        return jsonify({
            'available': False,
            'reason': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)

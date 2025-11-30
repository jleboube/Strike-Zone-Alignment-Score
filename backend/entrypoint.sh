#!/bin/bash
set -e

echo "=================================================="
echo "SZAS API Server Starting"
echo "=================================================="

# Check if we should pre-download data
if [ "${PRELOAD_DATA:-true}" = "true" ]; then
    echo "Checking for cached data..."

    CACHE_FILE="/app/data/statcast_${DEFAULT_YEAR:-2024}_full.parquet"

    if [ ! -f "$CACHE_FILE" ]; then
        echo "No cache found. Downloading ${DEFAULT_YEAR:-2024} Statcast data..."
        echo "This may take several minutes on first run..."
        python scripts/download_data.py --year ${DEFAULT_YEAR:-2024}
    else
        echo "Cache found: $CACHE_FILE"
    fi
fi

echo ""
echo "Starting Gunicorn server..."
echo "=================================================="

# Start the Flask app with Gunicorn
exec gunicorn --bind 0.0.0.0:5000 \
    --workers ${GUNICORN_WORKERS:-2} \
    --timeout ${GUNICORN_TIMEOUT:-120} \
    --access-logfile - \
    --error-logfile - \
    app:app

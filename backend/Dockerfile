# SZAS Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory and scripts directory
RUN mkdir -p /app/data /app/scripts

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh /app/scripts/download_data.py

# Expose the default port (will be mapped to obscure port in compose)
EXPOSE 5000

# Set environment variables with defaults
ENV PRELOAD_DATA=true
ENV DEFAULT_YEAR=2024
ENV GUNICORN_WORKERS=2
ENV GUNICORN_TIMEOUT=120

# Use entrypoint script for startup
ENTRYPOINT ["/app/entrypoint.sh"]

#!/bin/bash
# MapSnap startup script for local development and Cloud Run.
# CloudRun sets the PORT environment variable automatically.

set -e

PORT="${PORT:-8080}"

echo "Starting MapSnap on port ${PORT}"

# Use gunicorn for production, uvicorn for local dev
if [ -n "${GOOGLE_CLOUD_RUN:-}" ]; then
    exec gunicorn app:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${PORT} --workers 2 --timeout 120
else
    exec uvicorn app:app --host 0.0.0.0 --port ${PORT} --log-level info
fi

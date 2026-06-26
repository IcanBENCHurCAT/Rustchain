FROM python:3.12-slim

WORKDIR /app

# Install FAISS CPU dependency
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgomp1 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port (CloudRun will route traffic here)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python3 -c "import requests; r = requests.get('http://localhost:8080/health'); exit(0 if r.status_code == 200 else 1)" || true

# Start with gunicorn (production WSGI server) for CloudRun
CMD ["gunicorn", "app:app", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8080", "--workers", "2", "--timeout", "120"]

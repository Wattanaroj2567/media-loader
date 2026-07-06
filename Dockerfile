FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/apps/api:/app/apps/worker

WORKDIR /app

# Install system dependencies (curl, ffmpeg for media conversion)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
       curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml files to cache dependency layer
COPY apps/api/pyproject.toml ./apps/api/pyproject.toml
COPY apps/worker/pyproject.toml ./apps/worker/pyproject.toml

# Install dependencies for both API and Worker
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
       fastapi \
       "uvicorn[standard]" \
       pydantic \
       pydantic-settings \
       httpx \
       python-dotenv \
       supabase \
       yt-dlp \
       curl_cffi \
       watchfiles

# Copy the actual app codes
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker

# Create temp directories for media files
RUN mkdir -p /app/tmp/media-loader

# Create startup script to launch worker in background and API in foreground
RUN echo '#!/bin/sh' > start.sh \
    && echo 'python -m worker.main &' >> start.sh \
    && echo 'uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}' >> start.sh \
    && chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]

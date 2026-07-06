FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/apps/worker

# Install system dependencies for FFmpeg
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/worker/pyproject.toml ./pyproject.toml
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
       yt-dlp \
       supabase \
       python-dotenv \
       pydantic \
       pydantic-settings \
       watchfiles \
       curl_cffi

COPY apps/worker ./

# Create temp directory
RUN mkdir -p /app/tmp/media-loader

CMD ["python", "-m", "worker.main"]

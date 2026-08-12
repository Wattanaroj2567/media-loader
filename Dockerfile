FROM denoland/deno:bin-2.9.5 AS deno-runtime
FROM ghcr.io/astral-sh/uv:0.12.3 AS uv-runtime
FROM python:3.12-slim

COPY --from=deno-runtime /deno /usr/local/bin/deno
COPY --from=uv-runtime /uv /uvx /bin/

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
COPY apps/api/uv.lock ./apps/api/uv.lock
COPY apps/worker/pyproject.toml ./apps/worker/pyproject.toml
COPY apps/worker/uv.lock ./apps/worker/uv.lock

# Install dependencies for both API and Worker
RUN uv sync --directory apps/api --locked --no-dev --no-install-project \
    && uv sync --directory apps/worker --locked --no-dev --no-install-project

# Copy the actual app codes
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker

# Create temp directories for media files
RUN mkdir -p /app/tmp/media-loader

# Create startup script to launch worker in background and API in foreground
RUN echo '#!/bin/sh' > start.sh \
    && echo '/app/apps/worker/.venv/bin/python -m worker.main &' >> start.sh \
    && echo '/app/apps/api/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}' >> start.sh \
    && chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]

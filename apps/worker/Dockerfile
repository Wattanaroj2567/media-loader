FROM denoland/deno:bin-2.9.5 AS deno-runtime
FROM ghcr.io/astral-sh/uv:0.12.3 AS uv-runtime
FROM python:3.12-slim

COPY --from=deno-runtime /deno /usr/local/bin/deno
COPY --from=uv-runtime /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_PROJECT_ENVIRONMENT="/opt/venv"
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app/apps/worker

# Install system dependencies for FFmpeg
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/worker/pyproject.toml ./pyproject.toml
COPY apps/worker/uv.lock ./uv.lock
RUN uv sync --locked --no-dev --no-install-project

COPY apps/worker ./

# Create temp directory
RUN mkdir -p /app/tmp/media-loader

CMD ["python", "-m", "worker.main"]

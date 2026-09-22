FROM denoland/deno:bin-2.9.5 AS deno-runtime
FROM ghcr.io/astral-sh/uv:0.12.3 AS uv-runtime
FROM python:3.12-slim AS builder

COPY --from=uv-runtime /uv /uvx /bin/

ENV UV_PROJECT_ENVIRONMENT="/opt/venv"
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app/apps/api

COPY apps/api/pyproject.toml ./pyproject.toml
COPY apps/api/uv.lock ./uv.lock
RUN uv sync --locked --no-dev --no-install-project

FROM python:3.12-slim AS runtime

COPY --from=deno-runtime /deno /usr/local/bin/deno
COPY --from=builder /opt/venv /opt/venv

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:$PATH"

RUN groupadd --gid 10001 media-loader \
    && useradd --uid 10001 --gid media-loader --create-home media-loader

WORKDIR /app/apps/api

COPY --chown=media-loader:media-loader apps/api ./

RUN mkdir -p /app/tmp/media-loader \
    && chown -R media-loader:media-loader /app/tmp

USER media-loader

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

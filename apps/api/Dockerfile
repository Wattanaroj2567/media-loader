FROM denoland/deno:bin-2.9.5 AS deno-runtime
FROM ghcr.io/astral-sh/uv:0.12.3 AS uv-runtime
FROM python:3.12-slim

COPY --from=deno-runtime /deno /usr/local/bin/deno
COPY --from=uv-runtime /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/apps/api

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/pyproject.toml ./pyproject.toml
COPY apps/api/uv.lock ./uv.lock
RUN uv sync --locked --no-dev --no-install-project

COPY apps/api ./

EXPOSE 8000

CMD ["/app/apps/api/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

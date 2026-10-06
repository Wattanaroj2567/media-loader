FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PROXY_LISTEN_HOST=0.0.0.0

WORKDIR /app
COPY apps/proxy/server.py ./server.py

USER 10001:10001

EXPOSE 3128
CMD ["python", "server.py"]

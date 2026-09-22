from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.rate_limiter import RateLimiterMiddleware


def test_rate_limiter_allows_under_limit():
    app = FastAPI()
    app.add_middleware(RateLimiterMiddleware, max_requests=3, window_seconds=60)

    @app.get("/test")
    def sample():
        return {"status": "ok"}

    client = TestClient(app)
    for _ in range(3):
        resp = client.get("/test")
        assert resp.status_code == 200

    # 4th request exceeds limit
    over_limit_resp = client.get("/test")
    assert over_limit_resp.status_code == 429
    assert over_limit_resp.json()["error"]["code"] == "TOO_MANY_REQUESTS"


def test_rate_limiter_bypasses_health():
    app = FastAPI()
    app.add_middleware(RateLimiterMiddleware, max_requests=1, window_seconds=60)

    @app.get("/health")
    def health():
        return {"status": "healthy"}

    client = TestClient(app)
    # Multiple health calls should not be blocked
    for _ in range(5):
        resp = client.get("/health")
        assert resp.status_code == 200


def test_rate_limiter_ignores_cors_preflights():
    app = FastAPI()
    app.add_middleware(RateLimiterMiddleware, max_requests=2, window_seconds=60)

    @app.get("/test")
    def sample():
        return {"status": "ok"}

    client = TestClient(app)
    # Preflights must not consume the per-IP budget
    for _ in range(5):
        resp = client.options("/test")
        assert resp.status_code in (200, 400, 405)

    for _ in range(2):
        resp = client.get("/test")
        assert resp.status_code == 200

    over_limit_resp = client.get("/test")
    assert over_limit_resp.status_code == 429


def test_rate_limiter_separates_read_and_write_buckets():
    app = FastAPI()
    app.add_middleware(
        RateLimiterMiddleware,
        max_requests=2,
        window_seconds=60,
        read_max_requests=3,
    )

    @app.get("/downloads")
    def list_downloads():
        return {"jobs": []}

    @app.post("/downloads")
    def create_download():
        return {"job_id": "job-1"}

    client = TestClient(app)
    # Exhaust the write bucket
    for _ in range(2):
        assert client.post("/downloads").status_code == 200
    assert client.post("/downloads").status_code == 429

    # Reads still have their own budget
    for _ in range(3):
        assert client.get("/downloads").status_code == 200
    assert client.get("/downloads").status_code == 429

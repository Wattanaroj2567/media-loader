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

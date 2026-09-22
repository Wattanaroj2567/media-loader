import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding window in-memory rate limiter per client IP.

    Queue polling (cheap GET reads) uses a separate generous bucket so open
    tabs can never starve expensive actions like media analysis or job
    creation, which share the stricter default bucket.
    """

    def __init__(
        self,
        app,
        max_requests: int = 60,
        window_seconds: int = 60,
        read_max_requests: int = 180,
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.read_max_requests = read_max_requests
        self.requests: dict[tuple[str, str], list[float]] = defaultdict(list)

    @staticmethod
    def _bucket(request: Request) -> str:
        path = request.url.path
        if request.method == "GET" and (
            path == "/downloads" or path.startswith("/downloads/")
        ):
            return "read"
        return "write"

    async def dispatch(self, request: Request, call_next) -> Response:
        # Exclude health checks and CORS preflights from rate limiting.
        # Preflights carry no handler cost, but browsers send one before
        # nearly every cross-origin poll, so counting them would drain the
        # per-IP budget without any backend load.
        if request.url.path == "/health" or request.method == "OPTIONS":
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        bucket = self._bucket(request)
        limit = self.read_max_requests if bucket == "read" else self.max_requests
        key = (bucket, client_ip)
        now = time.time()

        # Clean old timestamps outside sliding window
        window_start = now - self.window_seconds
        timestamps = [t for t in self.requests[key] if t > window_start]
        self.requests[key] = timestamps

        if len(timestamps) >= limit:
            return JSONResponse(
                status_code=429,
                content={
                    "ok": False,
                    "data": None,
                    "error": {
                        "code": "TOO_MANY_REQUESTS",
                        "message": f"Rate limit exceeded. Maximum {limit} requests per {self.window_seconds}s.",
                    },
                },
                headers={"Retry-After": str(self.window_seconds)},
            )

        self.requests[key].append(now)
        return await call_next(request)

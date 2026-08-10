import time
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding window in-memory rate limiter per client IP.
    """
    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        # Exclude health check endpoint from rate limiting
        if request.url.path == "/health":
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()

        # Clean old timestamps outside sliding window
        window_start = now - self.window_seconds
        timestamps = [t for t in self.requests[client_ip] if t > window_start]
        self.requests[client_ip] = timestamps

        if len(timestamps) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "ok": False,
                    "data": None,
                    "error": {
                        "code": "TOO_MANY_REQUESTS",
                        "message": f"Rate limit exceeded. Maximum {self.max_requests} requests per {self.window_seconds}s."
                    }
                },
                headers={"Retry-After": str(self.window_seconds)}
            )

        self.requests[client_ip].append(now)
        return await call_next(request)

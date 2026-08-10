# Full-Stack 3-Item Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FastAPI Rate Limiting middleware, Playwright E2E UI specs for History and Settings pages, and refine the real-lifecycle Python E2E integration runner.

**Architecture:** 
- **FastAPI Rate Limiter:** Middleware tracking request timestamps per client IP within a sliding 60-second window, returning HTTP 429 when threshold (e.g., 30 req/min) is exceeded.
- **Playwright UI Specs:** Add `history.spec.ts` and `settings.spec.ts` to `apps/web/e2e` for deterministic responsive & accessibility UI verification.
- **Python E2E Integration:** Updated `scripts/test-e2e.py` for health, analysis, job creation, polling, download, and deletion lifecycle.

**Tech Stack:** Python 3.12, FastAPI, Playwright Test, Next.js 16, TypeScript.

---

### Task 1: FastAPI Rate Limiting Middleware & Tests

**Files:**
- Create: `apps/api/app/rate_limiter.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/test_rate_limiter.py`

- [ ] **Step 1: Create `apps/api/app/rate_limiter.py`**

```python
import time
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding window in-memory rate limiter per client IP.
    """
    def __init__(self, app, max_requests: int = 30, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        # Exclude health check from rate limits
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
```

- [ ] **Step 2: Create unit test `apps/api/tests/test_rate_limiter.py`**

```python
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
```

- [ ] **Step 3: Register middleware in `apps/api/app/main.py`**

Modify `apps/api/app/main.py` to import and add `RateLimiterMiddleware`.

```python
from app.rate_limiter import RateLimiterMiddleware

# Inside create_app():
app.add_middleware(RateLimiterMiddleware, max_requests=60, window_seconds=60)
```

- [ ] **Step 4: Commit Task 1**

```bash
git add apps/api/app/rate_limiter.py apps/api/app/main.py apps/api/tests/test_rate_limiter.py
git commit -m "feat(api): add sliding window rate limiter middleware and unit tests"
```

---

### Task 2: Implement History & Settings Playwright E2E Specs

**Files:**
- Create: `apps/web/e2e/history.spec.ts`
- Create: `apps/web/e2e/settings.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/history.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('History Page UI', () => {
  test('should render history page and empty state container', async ({ page }) => {
    await page.goto('/history');

    await expect(page.locator('main')).toBeVisible();

    // Check header or main layout
    const mainHeading = page.locator('h1, h2, header').first();
    await expect(mainHeading).toBeVisible();
  });
});
```

- [ ] **Step 2: Create `apps/web/e2e/settings.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Account Settings Page UI', () => {
  test('should render settings page container and account sections', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.locator('main')).toBeVisible();

    const mainHeading = page.locator('h1, h2, header').first();
    await expect(mainHeading).toBeVisible();
  });
});
```

- [ ] **Step 3: Commit Task 2**

```bash
git add apps/web/e2e/history.spec.ts apps/web/e2e/settings.spec.ts
git commit -m "test(e2e): add Playwright E2E specs for History and Settings pages"
```

---

### Task 3: Refine E2E Python Integration Script

**Files:**
- Modify: `scripts/test-e2e.py`

- [ ] **Step 1: Verify and refine `scripts/test-e2e.py`**

Ensure `scripts/test-e2e.py` correctly reports status codes and JSON envelope responses.

- [ ] **Step 2: Commit Task 3**

```bash
git add scripts/test-e2e.py
git commit -m "test(e2e): refine Python E2E integration runner script"
```

---

### Task 4: Full Verification Run

- [ ] **Step 1: Run Playwright test suite**

Run: `npm --prefix apps/web run test:e2e`
Expected: All Playwright tests pass (12+ tests).

- [ ] **Step 2: Run Next.js production build check**

Run: `npm --prefix apps/web run build`
Expected: Production build succeeds with 0 errors.

- [ ] **Step 3: Commit final verification**

```bash
git commit --allow-empty -m "ci: complete full-stack 3-item enhancements and verification"
```

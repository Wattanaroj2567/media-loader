# Full-Stack 3-Item Enhancement Specification

**Date:** 2026-08-10  
**Project:** Media Loader (`apps/api`, `apps/web`, `scripts`)  
**Status:** Approved Specification  

---

## 🎯 Goals & Scope

Implement 3 targeted enhancements across the stack:
1. **Item 1: Real Backend E2E Test Suite ([`scripts/test-e2e.py`](file:///D:/media-loader/scripts/test-e2e.py))**
   - Ensure the Python integration runner validates `/health`, `/media/analyze`, `/downloads`, `/files/download`, and `/files/delete` cleanly against running Docker API & Worker services.
2. **Item 2: FastAPI Rate Limiter Layer ([`apps/api/app/rate_limiter.py`](file:///D:/media-loader/apps/api/app/rate_limiter.py))**
   - Implement an in-memory client-IP sliding window rate limiter middleware for FastAPI.
   - Limit `/media/analyze` and `/downloads` endpoints (e.g., 20 requests/min per IP) to prevent DoS attacks.
   - Return standard HTTP 429 Too Many Requests response with error details.
   - Add unit tests in `apps/api/tests/test_rate_limiter.py`.
3. **Item 3: Playwright UI Specs for History & Settings ([`apps/web/e2e/history.spec.ts`](file:///D:/media-loader/apps/web/e2e/history.spec.ts) & [`apps/web/e2e/settings.spec.ts`](file:///D:/media-loader/apps/web/e2e/settings.spec.ts))**
   - Implement Playwright E2E tests for History page layout, search filter, and clear history dialog.
   - Implement Playwright E2E tests for Settings page layout, profile info, and sign out CTA.

---

## 📁 File Changes

- **Create:**
  - `apps/api/app/rate_limiter.py` — In-memory rate limiting middleware
  - `apps/api/tests/test_rate_limiter.py` — Pytest unit tests for rate limiter
  - `apps/web/e2e/history.spec.ts` — Playwright spec for History page
  - `apps/web/e2e/settings.spec.ts` — Playwright spec for Settings page
- **Modify:**
  - `apps/api/app/main.py` — Register rate limiter middleware
  - `scripts/test-e2e.py` — Enhanced E2E integration runner

---

## ✅ Success Criteria

1. Pytest suite `pytest apps/api/tests/test_rate_limiter.py` passes 100%.
2. All 12+ Playwright Web UI tests pass (`npm --prefix apps/web run test:e2e`).
3. Next.js production build (`npm --prefix apps/web run build`) compiles cleanly.
4. E2E Python runner (`python scripts/test-e2e.py`) executes cleanly against running services.

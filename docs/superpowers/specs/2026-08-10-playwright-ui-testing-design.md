# Full-Stack Quality Verification Spec (Web UI & Backend)

**Date:** 2026-08-10  
**Project:** Media Loader (`apps/web`, `apps/api`, `apps/worker`)  
**Status:** Approved Specification  

---

## 🎯 Goal & Overview

Provide a zero-overhead, highly-reliable test automation suite for Media Loader covering both **Web UI** (Playwright) and **Backend Services** (FastAPI, Python Media Worker, Policy Engine, and FFmpeg pipeline), catching regressions, security SSRF flaws, layout bugs, and transcoding failures with minimal setup complexity.

---

## 🛠️ Full-Stack Testing Strategy

### 1. Frontend Web UI Layer (`apps/web/e2e`)
Uses Playwright (`@playwright/test`) inside `apps/web` with auto-managed dev server:
- **Auto-managed Dev Server:** Playwright auto-starts `next dev` at `http://localhost:3000`.
- **Mocked Backend Routes:** `page.route()` intercepts `/media/analyze` and `/downloads` endpoints to test UI states (loading skeletons, format tables, rights confirmation, progress bars, download triggers) without requiring backend containers.
- **Viewport Safety:** Validates Desktop sidebar (>=1024px) vs Mobile bottom navigation (320px - 390px) and Dark/Light theme toggles.

### 2. Backend Unit & Policy Layer (`apps/api/tests` & `apps/worker/tests`)
Uses Pytest for FastAPI and Worker services:
- **URL Policy & SSRF Verification:** Asserts private IP blocking, protocol enforcement, and trusted domain whitelisting in `url_policy.py`.
- **Format Normalization & Quality Sorting:** Asserts yt-dlp metadata format extraction and deduplication.
- **Auth & Job Lifecycle:** Asserts JWT Bearer authentication, user scoping, and DB row locks.
- **FFmpeg Transcoding & Cleanup:** Asserts WebM/MP4/MP3 conversion and automatic temp file removal.

```bash
# Execution Commands
docker compose run --rm api pytest -v
docker compose run --rm worker pytest -v
```

### 3. End-to-End Integration Layer ([`scripts/test-e2e.py`](file:///D:/media-loader/scripts/test-e2e.py))
Leverages Python `httpx` to verify the full real lifecycle when containers are running:
- Health check verification (`GET /health`)
- Direct media URL policy analysis (`POST /media/analyze`)
- Job queueing & worker polling (`POST /downloads`, `GET /downloads/{id}`)
- Local file delivery & temp cleanup (`GET /files/download/{id}`, `DELETE /files/delete/{id}`)

### 4. Code Quality & Security Layer
- `npx tsx scripts/check-env.ts` — Secret leak protection.
- `npm --prefix apps/web run lint` — Next.js static analysis & Accessibility check.
- `npm --prefix apps/web test` — Built-in Node client logic test suite.

---

## 📁 File Structure

```text
apps/web/
  ├── e2e/
  │   ├── landing.spec.ts        # Landing page, CTA, Theme toggle
  │   ├── url-validation.spec.ts # Form inputs, error states, rights check
  │   ├── dashboard-mock.spec.ts # Mocked format selection & queue progress
  │   └── responsive.spec.ts     # Mobile vs Desktop navigation layout
  └── playwright.config.ts       # Playwright configuration

apps/api/tests/                  # 9 Pytest files for FastAPI & Policy
apps/worker/tests/               # Pytest files for Worker & FFmpeg
scripts/test-e2e.py              # E2E integration test script
```

---

## ✅ Success Criteria

1. `npx playwright test` passes all UI scenarios in headless mode.
2. Pytest suites in `apps/api` and `apps/worker` pass 100% of policy and transcoding tests.
3. `python scripts/test-e2e.py` completes full end-to-end download flow cleanly.
4. No complex external test infrastructure or high-maintenance setup required.

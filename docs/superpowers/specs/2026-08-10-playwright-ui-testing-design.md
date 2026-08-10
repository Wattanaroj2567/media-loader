# Playwright Web UI & Zero-Config Quality Verification Spec

**Date:** 2026-08-10  
**Project:** Media Loader (`apps/web` & monorepo backend)  
**Status:** Approved Specification  

---

## 🎯 Goal & Overview

Provide a zero-overhead, highly-reliable test automation suite for Media Loader that validates both the **Next.js Web UI** (using Playwright) and the **FastAPI/Worker Backend** (using existing Python E2E tools), catching regressions, layout flaws, and functional bugs with minimal setup complexity.

---

## 🛠️ Design Architecture & Tooling Strategy

### 1. Web UI Testing Layer (`apps/web/e2e`)
Uses Playwright (`@playwright/test`) within `apps/web` with zero complex server management:
- **Auto-managed Dev Server:** Playwright automatically manages `npm run dev` at `http://localhost:3000`.
- **Mocked Backend Routes:** `page.route()` intercepts `/media/analyze` and `/downloads` endpoints to allow deterministic UI testing (loading states, format badges, error alerts, queue progress, and download triggers) without external network dependencies.
- **Viewport & Accessibility Checks:** Tests desktop sidebar vs. mobile bottom navigation (320px - 1440px) and dark/light theme toggles.

### 2. Backend & Worker E2E Layer ([`scripts/test-e2e.py`](file:///D:/media-loader/scripts/test-e2e.py))
Leverages the existing Python E2E runner for full integration verification when Docker backend services are running:
- Health check verification (`GET /health`)
- Direct media URL policy analysis (`POST /media/analyze`)
- Job queueing & worker polling (`POST /downloads`, `GET /downloads/{id}`)
- Local file delivery & temp cleanup (`GET /files/download/{id}`, `DELETE /files/delete/{id}`)

### 3. Environment & Code Quality Verification Layer
- `npx tsx scripts/check-env.ts` — Secret leak safety check.
- `npm --prefix apps/web run lint` — Next.js static analysis & Accessibility check.
- `npm --prefix apps/web test` — Built-in Node test runner for client state & formatting logic.

---

## 📁 File Structure

```text
apps/web/
  ├── e2e/
  │   ├── landing.spec.ts        # Landing page, CTA, Theme toggle
  │   ├── url-validation.spec.ts # Form inputs, error states, rights check
  │   ├── dashboard-mock.spec.ts # Mocked format selection & queue progress
  │   └── responsive.spec.ts     # Mobile vs Desktop navigation layout
  └── playwright.config.ts       # Single concise Playwright config
```

---

## 🚀 Package Scripts (`apps/web/package.json`)

```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

---

## ✅ Success Criteria

1. `npx playwright test` runs smoothly on `apps/web` in headless mode and generates reports on failure.
2. Web UI responsive layouts (320px - 1440px) pass without overflow or broken controls.
3. Form validation and mocked format selection flow work deterministically.
4. Zero complex external infrastructure setup required for UI regression tests.

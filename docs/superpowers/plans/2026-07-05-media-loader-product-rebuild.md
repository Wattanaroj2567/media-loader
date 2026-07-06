# Media Loader Product Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, real-format, local-delivery Media Loader flow with a complete dark responsive UI, queue controls, history, and account deletion.

**Architecture:** The browser authenticates with Supabase and sends its access token to FastAPI. FastAPI owns policy, normalized analysis, user-scoped job operations, account deletion, and authenticated file delivery; the worker owns cancellable yt-dlp/FFmpeg processing in local temporary storage. PostgreSQL keeps metadata only and Supabase Storage stays out of the default path.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Lucide React, Supabase Auth/PostgreSQL, FastAPI, Pydantic, yt-dlp, FFmpeg, pytest, Node test runner

---

## File Map

- `apps/api/app/auth.py` — verify Supabase bearer tokens and expose the current user
- `apps/api/app/schemas.py` — canonical analysis and download contracts
- `apps/api/app/yt_dlp_service.py` — restricted extraction and pure format normalization
- `apps/api/app/job_service.py` — user-scoped job CRUD and lifecycle transitions
- `apps/api/app/file_service.py` — safe temp-path cleanup
- `apps/api/app/account_service.py` — account cleanup and Auth deletion
- `apps/api/app/routers/*.py` — authenticated endpoints
- `apps/worker/worker/processor.py` — format selection, progress, conversion, cancellation
- `apps/worker/worker/job_queue.py` — FIFO claim and cancellation checks
- `apps/web/lib/api-client.ts` — typed authenticated API boundary and save-to-device flow
- `apps/web/lib/media-presenters.ts` — pure format/status presentation helpers
- `apps/web/components/app-shell.tsx` — responsive navigation shell
- `apps/web/components/media-analyzer.tsx` — analysis and format-selection workspace
- `apps/web/components/job-*.tsx` — queue/history presentation and actions
- `apps/web/app/(app)/*` — the four product destinations
- `supabase/migrations/0003_job_metadata.sql` — metadata fields required by history

### Task 1: Lock the real metadata contract

**Files:**
- Create: `apps/api/tests/test_media_normalization.py`
- Modify: `apps/api/app/schemas.py`
- Modify: `apps/api/app/yt_dlp_service.py`

- [ ] Write tests that call the wished-for `normalize_extractor_result(raw_info)` with duplicate 1080p formats, 144–2160p formats, audio-only formats, uploader data, FPS and approximate sizes.
- [ ] Run `apps/api/.venv/Scripts/python.exe -m pytest tests/test_media_normalization.py -q` and confirm import/field failures.
- [ ] Add canonical `MediaMetadata` and `FormatInfo` fields, remove the DASH/HLS skip option, deduplicate formats from real extractor values, and raise an application error for extraction failure.
- [ ] Re-run the focused test and then the complete API test suite.

### Task 2: Enforce authentication and user scoping

**Files:**
- Create: `apps/api/tests/test_auth_and_jobs.py`
- Create: `apps/api/app/auth.py`
- Modify: `apps/api/app/policy_logger.py`
- Modify: `apps/api/app/job_service.py`
- Modify: `apps/api/app/routers/media.py`
- Modify: `apps/api/app/routers/downloads.py`

- [ ] Write failing tests for missing bearer token, malformed token, `user_id` filters, no first-profile fallback, metadata persistence and invalid job transitions.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Implement `CurrentUser`, token verification, user-scoped list/get/create/update/delete, policy recheck on job creation, and metadata persistence.
- [ ] Re-run focused and complete API tests.

### Task 3: Add cancel, delete, local file delivery, and account deletion

**Files:**
- Create: `apps/api/tests/test_job_lifecycle.py`
- Create: `apps/api/tests/test_file_service.py`
- Create: `apps/api/app/file_service.py`
- Create: `apps/api/app/account_service.py`
- Create: `apps/api/app/routers/account.py`
- Modify: `apps/api/app/routers/downloads.py`
- Modify: `apps/api/app/routers/files.py`
- Modify: `apps/api/app/main.py`

- [ ] Write failing tests for cancellable statuses, queued/terminal deletion, refusal to escape the temp root, post-response cleanup, and user-scoped account cleanup.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Implement `POST /downloads/{id}/cancel`, `DELETE /downloads/{id}`, authenticated file streaming with cleanup, and `DELETE /account`.
- [ ] Re-run focused and complete API tests.

### Task 4: Make the worker cancellable and faithful to the selection

**Files:**
- Create: `apps/worker/tests/test_processor.py`
- Modify: `apps/worker/worker/job_queue.py`
- Modify: `apps/worker/worker/processor.py`
- Modify: `apps/worker/worker/main.py`

- [ ] Write failing tests for FIFO order intent, video+audio selector construction, audio selector construction, cancellation preservation, and progress calculation.
- [ ] Run worker tests and confirm failures.
- [ ] Implement throttled progress hooks, cancellation polling, cancellable FFmpeg processes, safe cleanup, and terminal-state protection.
- [ ] Re-run worker tests.

### Task 5: Build typed frontend behavior

**Files:**
- Create: `apps/web/lib/media-presenters.test.ts`
- Create: `apps/web/lib/media-presenters.ts`
- Modify: `apps/web/lib/api-client.ts`
- Modify: `apps/web/package.json`

- [ ] Write failing Node tests for real quality labels, video/audio grouping, terminal/active grouping and safe download filenames.
- [ ] Run `pnpm --filter web test` and confirm missing-module failures.
- [ ] Implement the helpers and an authenticated API client that supports analyze, create, list, cancel, delete, file save and account deletion.
- [ ] Re-run frontend unit tests.

### Task 6: Rebuild the application shell and copy

**Files:**
- Create: `apps/web/components/app-shell.tsx`
- Modify: `apps/web/app/(app)/layout.tsx`
- Modify: `apps/web/components/top-bar.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/lib/i18n/messages/th.json`
- Modify: `apps/web/lib/i18n/messages/en.json`

- [ ] Replace the warm light token set with the neutral dark command-center tokens and reduced-motion rules.
- [ ] Build desktop sidebar, compact mobile header and mobile bottom navigation for New Download, Queue, History and Account.
- [ ] Replace generic Dashboard/Downloads/Preferences copy with task-oriented Thai and English labels.
- [ ] Run frontend lint and fix all new warnings/errors.

### Task 7: Rebuild analyze and format selection UX

**Files:**
- Create: `apps/web/components/media-analyzer.tsx`
- Modify: `apps/web/app/(app)/dashboard/page.tsx`
- Remove after replacement: `apps/web/components/url-analyzer.tsx`

- [ ] Build labeled URL input, explicit rights confirmation, loading/error/blocked states, horizontal metadata preview, creator/domain/duration fields, video/audio tabs and actual quality cards.
- [ ] Wire queue creation to the selected real format and preserve disabled/loading feedback.
- [ ] Verify keyboard focus, image fallback, long-title wrapping and 375px layout with lint/build.

### Task 8: Separate queue, history, and account behavior

**Files:**
- Create: `apps/web/components/job-list.tsx`
- Modify: `apps/web/app/(app)/downloads/page.tsx`
- Modify: `apps/web/app/(app)/history/page.tsx`
- Modify: `apps/web/app/(app)/settings/page.tsx`
- Remove after replacement: `apps/web/components/activity-feed.tsx`

- [ ] Make Queue show active jobs with progress, cancel and queued-delete actions.
- [ ] Make History show terminal jobs with search/filter, save-to-device, unavailable-file state and record deletion.
- [ ] Make Account show session details, sign out, and a typed-confirmation delete-account dialog.
- [ ] Run frontend unit tests, lint and build.

### Task 9: Align schema and documentation

**Files:**
- Create: `supabase/migrations/0003_job_metadata.sql`
- Modify: `supabase/schema.sql`
- Modify: `docs/API_SPEC.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/USER_SETUP_GUIDE.md`
- Modify: `docs/UI_UX_GUIDE.md`
- Modify: `README.md`
- Modify: `TODO.md`

- [ ] Add uploader, duration and source-domain metadata columns without storing media blobs.
- [ ] Document bearer auth, real-format semantics, queue/history split, one-time local delivery and account deletion.
- [ ] Replace inaccurate completed TODO claims with a verified rebuild checklist.

### Task 10: Full verification

**Files:**
- Verify only

- [ ] Run API tests: `apps/api/.venv/Scripts/python.exe -m pytest -q`.
- [ ] Run worker tests in its available environment or Docker.
- [ ] Run `pnpm --filter web test`, `pnpm --filter web lint`, and `pnpm --filter web build`.
- [ ] Start the local frontend and inspect 375px and desktop layouts in the in-app browser.
- [ ] Start Docker API/worker when local runtime permits and verify health plus an authenticated public-domain flow without printing environment values.

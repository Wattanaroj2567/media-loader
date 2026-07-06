# TODO.md

Master checklist to reach **daily-use ready** Media Loader.

All phases of the local workflow are implemented. The rebuild plan from 2026-07-05 is complete and verified.

---

## Phase 0 — Repository Foundation

- [x] Confirm repo root is the application monorepo (`apps/` at root)
- [x] Create monorepo root structure at repo root
- [x] Add root `README.md`
- [x] Add `AGENTS.md`
- [x] Add `.gitignore`
- [x] Add `.editorconfig`
- [x] Add `.env.example`
- [x] Add package manager config
- [x] Add initial docs folder
- [x] Add workspace scripts
- [x] Add basic development instructions

---

## Phase 1 — Next.js Frontend Foundation

- [x] Initialize `apps/web` with Next.js and TypeScript
- [x] Install Tailwind CSS
- [x] Install shadcn/ui
- [x] Install Lucide React or Tabler Icons
- [x] Install Supabase client packages (Phase 3)
- [x] Create app layout
- [x] Create dark theme tokens
- [x] Create landing page
- [x] Create protected dashboard shell
- [x] Create reusable components
- [x] Add responsive layout

---

## Phase 2 — Supabase Setup

- [x] Create Supabase schema migration (and README instructions guide)
- [x] Create `profiles` table
- [x] Create `download_jobs` table
- [x] Create `media_formats` table
- [x] Create `policy_logs` table
- [x] Create `user_settings` table
- [x] Enable Row Level Security
- [x] Add RLS policies
- [x] Review `docs/SUPABASE_RLS_POLICY.md`
- [x] Create private storage bucket (Optional, for later cloud storage)
- [x] Add storage access rules (Optional, for later cloud storage)
- [x] Test user-specific data access (Documented verification query checks)

---

## Phase 3 — Authentication

- [x] Configure Supabase Google Auth using `docs/GOOGLE_OAUTH_SETUP.md`
- [x] Create login page/button
- [x] Create auth callback route
- [x] Create sign out action
- [x] Protect dashboard routes
- [x] Create profile bootstrap logic
- [x] Add auth loading states
- [x] Add auth error states

---

## Phase 4 — URL Analyzer UI

- [x] Create URL input form
- [x] Add URL validation
- [x] Add rights confirmation UI
- [x] Add analyze button
- [x] Add policy result card
- [x] Add metadata preview card
- [x] Add format selection table/card
- [x] Add empty state
- [x] Add loading skeleton
- [x] Add error state

---

## Phase 5 — Local Docker Backend Foundation

- [x] Review `docs/LOCAL_DOCKER_BACKEND.md`
- [x] Create root `docker-compose.yml` for local API and worker services
- [x] Create root `.dockerignore`
- [x] Initialize `apps/api` with FastAPI
- [x] Add `apps/api/Dockerfile`
- [x] Add health endpoint
- [x] Add configuration loader
- [x] Add CORS config
- [x] Add Supabase server client
- [x] Add request validation schemas
- [x] Add common response format
- [x] Add error handling middleware
- [x] Add `/media/analyze` endpoint
- [x] Add `/downloads` endpoint
- [x] Verify FastAPI with `docker compose up --build`
- [x] Verify `curl http://localhost:8000/health` returns OK

---

## Phase 6 — Policy Layer

- [x] Implement URL parser
- [x] Implement domain detection
- [x] Block unsupported protocols
- [x] Block private IP ranges
- [x] Block localhost URLs
- [x] Detect direct media URLs
- [x] Detect known platform URLs
- [x] Return `allowed`, `blocked`, or `needs_confirmation`
- [x] Insert policy log
- [x] Add policy tests
- [x] Fix whitelist suffix match to prevent domain spoofing (2026-07-05)
- [x] Fix default decision to `needs_confirmation` for public URLs (2026-07-05)

---

## Phase 7 — Media Analysis

- [x] Add direct media analyzer
- [x] Add restricted yt-dlp metadata extraction
- [x] Normalize metadata response
- [x] Normalize format list
- [x] Deduplicate formats by real height+fps key
- [x] Hide unsafe/internal extractor details
- [x] Handle unsupported platforms clearly
- [x] Handle extraction timeout
- [x] Add analysis tests

---

## Phase 8 — Job Creation

- [x] Create `download_jobs` insert flow
- [x] Save selected format
- [x] Save rights confirmation flag
- [x] Save initial job status
- [x] Return job ID to frontend
- [x] Show job status in UI
- [x] Add cancel/delete queue flow
- [x] Persist analysis metadata (uploader, platform, duration, source_domain)
- [x] Enforce user scoping on all job operations

---

## Phase 9 — Docker Worker Foundation

- [x] Initialize `apps/worker`
- [x] Add `apps/worker/Dockerfile`
- [x] Add Supabase service role client server-side only
- [x] Add queue polling logic
- [x] Pick queued jobs safely
- [x] Lock jobs before processing
- [x] Update job status
- [x] Add temp directory management through Docker-mounted `./tmp` volume
- [x] Add structured logs without secrets

---

## Phase 10 — Media Processing

- [x] Add yt-dlp restricted download service
- [x] Add FFmpeg conversion service
- [x] Add MP4 output support
- [x] Add MP3 output support
- [x] Add throttled progress update hooks
- [x] Add cancellation polling during download
- [x] Add cancellable FFmpeg processes
- [x] Add output file validation
- [x] Add file size limit
- [x] Add cleanup after failure
- [x] Add worker tests/manual verification

---

## Phase 11 — Storage and File Access

- [x] Implement local temporary output mode as the default Free tier behavior
- [x] Add controlled local file download action through FastAPI
- [x] Add temp file cleanup policy
- [x] Upload completed output to Supabase Storage only as optional cloud mode
- [x] Save local temp output path to `download_jobs.storage_path`
- [x] Serve completed local temp file through authenticated FastAPI endpoint
- [x] Add frontend download button (save-to-device via File System Access API)
- [x] Add delete file action
- [x] Add local temp storage usage summary
- [x] Add cleanup policy

---

## Phase 12 — Download History

- [x] Create history page
- [x] List user jobs
- [x] Add filter by status
- [x] Add search by title/domain
- [ ] Add retry failed job action (not part of the current requested rebuild)
- [x] Add delete history action
- [x] Add file download action
- [x] Add responsive table/card view

---

## Phase 13 — Account

- [x] Create account page
- [x] Show Google profile details
- [x] Add sign out action
- [x] Add account deletion with typed confirmation
- [x] Cancel active jobs during account deletion
- [x] Clean local temp files during account deletion

---

## Phase 14 — Vercel Deployment

- [x] Add Vercel project setup guide
- [x] Configure Vercel environment variables
- [x] Configure production Supabase callback URLs
- [x] Add vercel.json for monorepo configuration
- [ ] Test production login (requires actual deployment)
- [ ] Test protected routes (requires actual deployment)
- [ ] Test frontend API connection (requires backend deployment)

---

## Phase 15 — Final Verification (2026-07-05 Rebuild)

- [x] Run API test suite: `23/23 passed`
- [x] Run frontend tests: `7/7 passed`
- [x] Run frontend lint: no errors
- [x] Run frontend build: compiled successfully (Next.js 16.2.10)
- [ ] Run worker tests in Docker environment
- [ ] Manual end-to-end test with a real public-domain URL
- [ ] Apply migration `0003_job_metadata.sql` to production Supabase

---

## Rebuild Checklist (2026-07-05 plan tasks)

- [x] Task 1: Lock real metadata contract (schemas + yt_dlp_service + tests)
- [x] Task 2: Enforce authentication and user scoping
- [x] Task 3: Cancel, delete, local file delivery, account deletion
- [x] Task 4: Worker cancellable and faithful format selection
- [x] Task 5: Typed frontend behavior (media-presenters + api-client)
- [x] Task 6: Application shell rebuild (dark command-center UI)
- [x] Task 7: Analyze and format selection UX rebuild
- [x] Task 8: Queue, history, and account separation
- [x] Task 9: Schema and documentation alignment
- [x] Task 10: Full verification (API/worker/frontend tests + build)

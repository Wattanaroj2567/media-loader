# TODO.md

This is the master implementation checklist for AI Agents.

Agents must work phase by phase. Do not skip to later phases unless dependencies are complete.

---

## Phase 0 — Repository Foundation

- [x] Confirm work package root and create implementation directory `./media-loader`
- [x] Create monorepo root structure inside `./media-loader`
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
- [ ] Install Supabase client packages (Phase 3)
- [x] Create app layout
- [x] Create dark theme tokens
- [x] Create landing page
- [x] Create protected dashboard shell
- [x] Create reusable components
- [x] Add responsive layout

---

## Phase 2 — Supabase Setup

- [x] Create Supabase schema migration (and README instructions guide)
- [ ] Create `profiles` table
- [ ] Create `download_jobs` table
- [ ] Create `media_formats` table
- [ ] Create `policy_logs` table
- [ ] Create `user_settings` table
- [ ] Enable Row Level Security
- [ ] Add RLS policies
- [ ] Review `docs/SUPABASE_RLS_POLICY.md`
- [ ] Create private storage bucket (Optional, for later cloud storage)
- [ ] Add storage access rules (Optional, for later cloud storage)
- [ ] Test user-specific data access (Documented verification query checks)

---

## Phase 3 — Authentication

- [ ] Configure Supabase Google Auth using `docs/GOOGLE_OAUTH_SETUP.md`
- [ ] Create login page/button
- [ ] Create auth callback route
- [ ] Create sign out action
- [ ] Protect dashboard routes
- [ ] Create profile bootstrap logic
- [ ] Add auth loading states
- [ ] Add auth error states

---

## Phase 4 — URL Analyzer UI

- [ ] Create URL input form
- [ ] Add URL validation
- [ ] Add rights confirmation UI
- [ ] Add analyze button
- [ ] Add policy result card
- [ ] Add metadata preview card
- [ ] Add format selection table/card
- [ ] Add empty state
- [ ] Add loading skeleton
- [ ] Add error state

---

## Phase 5 — Local Docker Backend Foundation

- [ ] Review `docs/LOCAL_DOCKER_BACKEND.md`
- [ ] Create root `docker-compose.yml` for local API and worker services
- [ ] Create root `.dockerignore`
- [ ] Initialize `apps/api` with FastAPI
- [ ] Add `apps/api/Dockerfile`
- [ ] Add health endpoint
- [ ] Add configuration loader
- [ ] Add CORS config
- [ ] Add Supabase server client
- [ ] Add request validation schemas
- [ ] Add common response format
- [ ] Add error handling middleware
- [ ] Add `/media/analyze` endpoint
- [ ] Add `/downloads` endpoint
- [ ] Verify FastAPI with `docker compose up --build`
- [ ] Verify `curl http://localhost:8000/health` returns OK

---

## Phase 6 — Policy Layer

- [ ] Implement URL parser
- [ ] Implement domain detection
- [ ] Block unsupported protocols
- [ ] Block private IP ranges
- [ ] Block localhost URLs
- [ ] Detect direct media URLs
- [ ] Detect known platform URLs
- [ ] Return `allowed`, `blocked`, or `needs_confirmation`
- [ ] Insert policy log
- [ ] Add policy tests

---

## Phase 7 — Media Analysis

- [ ] Add direct media analyzer
- [ ] Add restricted yt-dlp metadata extraction
- [ ] Normalize metadata response
- [ ] Normalize format list
- [ ] Hide unsafe/internal extractor details
- [ ] Handle unsupported platforms clearly
- [ ] Handle extraction timeout
- [ ] Add analysis tests

---

## Phase 8 — Job Creation

- [ ] Create `download_jobs` insert flow
- [ ] Save selected format
- [ ] Save rights confirmation flag
- [ ] Save initial job status
- [ ] Return job ID to frontend
- [ ] Show job status in UI
- [ ] Add retry/cancel placeholders

---

## Phase 9 — Docker Worker Foundation

- [ ] Initialize `apps/worker`
- [ ] Add `apps/worker/Dockerfile`
- [ ] Add Supabase service role client server-side only
- [ ] Add queue polling logic
- [ ] Pick queued jobs safely
- [ ] Lock jobs before processing
- [ ] Update job status
- [ ] Add temp directory management through Docker-mounted `./tmp` volume
- [ ] Add structured logs without secrets

---

## Phase 10 — Media Processing

- [ ] Add yt-dlp restricted download service
- [ ] Add FFmpeg conversion service
- [ ] Add MP4 output support
- [ ] Add MP3 output support
- [ ] Add progress update hooks
- [ ] Add output file validation
- [ ] Add file size limit
- [ ] Add cleanup after failure
- [ ] Add worker tests/manual verification

---

## Phase 11 — Storage and File Access

- [ ] Implement local temporary output mode as the default Free tier behavior
- [ ] Add controlled local file download action through FastAPI
- [ ] Add temp file cleanup policy
- [ ] Upload completed output to Supabase Storage only as optional cloud mode
- [ ] Save storage path to `download_jobs`
- [ ] Generate signed download URL
- [ ] Add frontend download button
- [ ] Add delete file action
- [ ] Add local temp storage usage summary
- [ ] Add cleanup policy

---

## Phase 12 — Download History

- [ ] Create history page
- [ ] List user jobs
- [ ] Add filter by status
- [ ] Add search by title/domain
- [ ] Add retry failed job action
- [ ] Add delete history action
- [ ] Add file download action
- [ ] Add responsive table/card view

---

## Phase 13 — Settings

- [ ] Create settings page
- [ ] Add default video quality
- [ ] Add default audio quality
- [ ] Add max file size setting
- [ ] Add auto cleanup days
- [ ] Add allowed/blocked domain notes
- [ ] Save settings to Supabase

---

## Phase 14 — Vercel Deployment

- [ ] Add Vercel project setup guide
- [ ] Configure Vercel environment variables
- [ ] Configure production Supabase callback URLs
- [ ] Test production login
- [ ] Test protected routes
- [ ] Test frontend API connection

---

## Phase 15 — Final Review

- [ ] Run environment checks
- [ ] Review `docs/LOCAL_DEV_CHECKLIST.md`
- [ ] Run frontend lint
- [ ] Run backend tests
- [ ] Review secret exposure
- [ ] Review RLS policies
- [ ] Review UI consistency
- [ ] Review policy bypass paths
- [ ] Update README
- [ ] Update setup guides
- [ ] Prepare final handoff notes

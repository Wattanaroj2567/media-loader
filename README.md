# Media Loader

**Media Loader** is a personal, rights-aware media workspace for analyzing media URLs, selecting available video/audio quality, downloading allowed media, converting files, and keeping a private download history.

Built with **Next.js**, **Vercel**, **Supabase**, **FastAPI**, Docker, and a separate Python media worker — intended for **real daily use**, not as a tutorial repo.

---

## Quick Start

1. Copy `.env.example` to `.env.local` and fill Supabase + Google OAuth values (see `docs/USER_SETUP_GUIDE.md`).
2. Apply Supabase migrations from `supabase/migrations/`.
3. Start the API: `docker compose up --build api`
4. Start the frontend: `cd apps/web && pnpm install && pnpm dev`
5. Open `http://localhost:3000`, sign in with Google, and use the dashboard.

Start the worker with:

```bash
docker compose --profile worker up --build
```

Current shipping status: see `TODO.md`. The core local workflow is implemented; production deployment checks still require the user's actual Vercel/Supabase environment.

---

## What This Project Does

Media Loader helps a user:

- Sign in with Google using Supabase Auth
- Paste a media URL for analysis
- Check whether the URL is allowed by the project policy
- Preview basic media metadata when available
- View available video/audio formats when supported
- Select video quality such as 1080p, 720p, or lower formats when available
- Select audio output such as original audio or MP3 conversion
- Queue a download/conversion job
- Track job status and progress
- Store history metadata in Supabase and use local temporary media output by default
- Save finished files through the browser/Explorer dialog, then clear local temp output
- View private download history
- Delete history records or stored files
- Manage account actions such as sign out and account deletion

---

## What This Project Is Not

Media Loader is **not** a tool for bypassing restrictions.

It must not be used to:

- Bypass DRM
- Bypass login walls
- Download private content without permission
- Scrape protected platform content
- Circumvent platform protections
- Use browser cookies to access restricted media
- Encourage copyright infringement

Every URL must pass a policy check before analysis or download.

---

## Core Features

### Account and Dashboard

- Google login through Supabase Auth
- Protected dashboard route
- Modern dark UI
- Simple personal workspace layout
- Download history per user

### URL Analysis

- URL input with validation
- Platform/domain detection
- Rights-aware policy check
- Direct media URL support
- Metadata preview when supported
- Format and quality list when available

### Download and Convert

- Download allowed media only
- Select video/audio quality when available
- MP4 output support
- MP3 conversion support through FFmpeg
- Separate worker process for heavy media tasks
- Progress/status tracking

### Storage and History

- Supabase PostgreSQL for job records
- Supabase Storage only as optional future/cloud mode
- Local Docker backend for FastAPI and media worker
- Authenticated FastAPI local file delivery
- Private user history
- Cancel/delete/automatic temp-cleanup workflow

### Safety and Security

- Secret-safe setup process
- No secret printing
- No `.env.local` commits
- RLS-first Supabase database design
- SSRF-aware URL validation
- Server-side service role only
- Policy layer before media processing

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, TypeScript |
| Hosting | Vercel |
| Auth | Supabase Auth with Google |
| Database | Supabase PostgreSQL |
| Storage | Local temp output by default; Supabase Storage optional |
| Backend API | FastAPI running locally in Docker |
| Worker | Python worker running locally in Docker |
| Local Runtime | Docker Compose |
| Media tools | yt-dlp restricted mode, FFmpeg |
| UI | Tailwind CSS, shadcn/ui |
| Icons | Lucide React or Tabler Icons |
| State/API | Typed fetch client |

---

## High-Level Architecture

```text
User
  ↓
Next.js Web App on Vercel
  - Login
  - Dashboard
  - URL analyzer
  - Format selection
  - History
  ↓
Supabase
  - Auth
  - PostgreSQL
  - Optional Storage
  - Optional Realtime
  ↓
FastAPI
  - Policy check
  - URL validation
  - Metadata analysis
  - Job creation
  ↓
Python Media Worker
  - Picks queued jobs
  - Downloads allowed media
  - Converts/merges with FFmpeg
  - Serves local temp output through FastAPI
  - Updates job status
```

---

## Main Pages

| Page | Purpose |
| --- | --- |
| Landing | Explain the product and show Google login |
| Dashboard | New load analyzer |
| Analyze Result | Show metadata, policy result, and available formats |
| Queue | Show queued/running jobs, progress, cancel, and delete queue actions |
| History | Show completed/failed/blocked/cancelled jobs and save finished files |
| Account | Google profile, sign out, and delete account |

---

## Project Structure

This project is set up as a monorepo using **pnpm workspaces** directly in the workspace root:

```text
media-loader/
├─ README.md
├─ AGENTS.md               # Project rules for contributors and agents
├─ TODO.md                 # Master implementation checklist
├─ .gitignore
├─ .editorconfig
├─ .env.example
├─ .env.local
├─ package.json
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
├─ apps/
│  ├─ web/                 # Next.js frontend application (Vercel deployment)
│  ├─ api/                 # FastAPI backend service (Docker runtime)
│  └─ worker/              # Python-based media worker (Docker runtime)
├─ docs/                   # Architecture, guidelines, specs and roadmap documentation
│  ├─ API_SPEC.md
│  ├─ ARCHITECTURE.md
│  ├─ DATABASE_SCHEMA.md
│  ├─ DECISION_LOG.md
│  ├─ DEVELOPMENT_WORKFLOW.md
│  ├─ ENVIRONMENT_VARIABLES.md
│  ├─ FASTAPI_WORKER_PLAN.md
│  ├─ GOOGLE_OAUTH_SETUP.md
│  ├─ LOCAL_DEV_CHECKLIST.md
│  ├─ PATCH_NOTES.md
│  ├─ PROJECT_BRIEF.md
│  ├─ PROJECT_OUTPUT_LOCATION.md
│  ├─ ROADMAP.md
│  ├─ SECRETS_PROTOCOL.md
│  ├─ SECURITY_AND_POLICY.md
│  ├─ SUPABASE_RLS_POLICY.md
│  ├─ SUPABASE_SETUP.md
│  ├─ TESTING_PLAN.md
│  ├─ UI_UX_GUIDE.md
│  ├─ USER_SETUP_GUIDE.md
│  ├─ VERCEL_SETUP.md
│  └─ WORKTREE_STRUCTURE.md
├─ supabase/               # Supabase database config, migrations, schemas & policies
│  ├─ README.md
│  ├─ schema.sql
│  ├─ rls_policies.sql
│  └─ migrations/
│     └─ 0001_initial_schema.sql
├─ prompts/                # Optional role prompts for coding assistants
│  ├─ frontend-agent.md
│  ├─ backend-agent.md
│  ├─ worker-agent.md
│  ├─ supabase-agent.md
│  ├─ uiux-agent.md
│  ├─ security-agent.md
│  └─ reviewer-agent.md
├─ scripts/                # Utility scripts (e.g. check-env.ts)
└─ examples/               # Reference Docker and environment configuration templates
   ├─ .dockerignore.example
   ├─ .env.example
   ├─ apps-api.Dockerfile
   ├─ apps-worker.Dockerfile
   └─ docker-compose.local.yml
```

---

## Documentation Index

| Doc | Purpose |
| --- | --- |
| `docs/USER_SETUP_GUIDE.md` | First-time setup (Supabase, Google, env) |
| `docs/LOCAL_DEV_CHECKLIST.md` | Verify local stack before use |
| `docs/ARCHITECTURE.md` | How frontend, API, worker, and Supabase connect |
| `docs/API_SPEC.md` | FastAPI endpoints |
| `TODO.md` | Remaining work to reach full daily use |
| `AGENTS.md` | Rules for contributors and coding agents |

---

## Secret Handling

This project never asks the user to paste secrets into chat.

The user must manually add keys to local `.env` files or deployment environment variables.

Agents may only check whether required values exist. They must never print secret values.

Correct workflow:

```text
Agent creates .env.example
Agent tells user where to get each key
User adds keys locally
User says "added"
Agent runs validation
Agent reports OK / Missing / Invalid only
```

---

## What Works Today vs. What's Next

| Area | Status |
| --- | --- |
| Google login, dark app shell, new load analyzer | ✅ Complete |
| Policy checks, real metadata/format extraction, job creation | ✅ Complete |
| Worker download/convert, cancellation, local file delivery | ✅ Complete |
| Queue, history, save-file action, account deletion | ✅ Complete |
| Production deploy (Vercel) | ⏳ Setup guide complete; live deployment testing still required |

All core features are implemented. See `TODO.md` for deployment testing steps.

---

## Product Principle

Keep the application simple, private, safe, and reliable for everyday use.

The goal is not the most aggressive downloader. The goal is a rights-aware personal media utility you can actually run and trust.

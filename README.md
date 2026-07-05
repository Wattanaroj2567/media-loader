# Media Loader

**Media Loader** is a personal, rights-aware media workspace for analyzing media URLs, selecting available video/audio quality, downloading allowed media, converting files, and keeping a private download history.

The project is designed for learning modern full-stack development with **Next.js**, **Vercel**, **Supabase**, **FastAPI**, Docker, and a separate Python media worker.

> This repository is an AI Agent Work Package. It contains the planning documents, rules, TODO list, setup guide, architecture, and implementation prompts needed for an AI coding agent to build the real project safely and consistently.

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
- Store history in Supabase and use local temporary media output by default
- Optionally upload small/temporary completed files to Supabase Storage
- View private download history
- Delete history records or stored files
- Manage personal settings such as default quality and cleanup rules

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
- Supabase Storage for optional small/temporary completed files
- Local Docker backend for FastAPI and media worker
- Signed URL generation for secure file access
- Private user history
- Retry/delete/cleanup workflow

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
|---|---|
| Frontend | Next.js, TypeScript |
| Hosting | Vercel |
| Auth | Supabase Auth with Google |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Backend API | FastAPI running locally in Docker |
| Worker | Python worker running locally in Docker |
| Local Runtime | Docker Compose |
| Media tools | yt-dlp restricted mode, FFmpeg |
| UI | Tailwind CSS, shadcn/ui |
| Icons | Lucide React or Tabler Icons |
| State/API | TanStack Query |

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
  - Storage
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
  - Uploads to Supabase Storage
  - Updates job status
```

---

## Main Pages

| Page | Purpose |
|---|---|
| Landing | Explain the product and show Google login |
| Dashboard | Main URL analyzer and quick job view |
| Analyze Result | Show metadata, policy result, and available formats |
| Download Progress | Show queue/download/convert/completed status |
| History | Show previous downloads and file actions |
| Settings | Default quality, cleanup, and personal preferences |

---


## Where the Real Project Will Be Created

This Zip is the AI Agent work package. It contains the planning documents and rules.

When an AI coding agent starts implementation, it must create the real application project inside:

```text
./media-loader
```

Recommended final layout:

```text
media-loader-agent-workpack/
├─ README.md
├─ AGENTS.md
├─ TODO.md
├─ docs/
├─ prompts/
└─ media-loader/        # Real generated project code
```

Use this instruction when starting the agent:

```text
Create the real implementation project inside ./media-loader only. Do not create source code directly in the work package root.
```

## Project Work Package Structure

```text
media-loader-agent-workpack/
├─ README.md
├─ AGENTS.md
├─ TODO.md
├─ PROJECT_BRIEF.md
├─ ARCHITECTURE.md
├─ API_SPEC.md
├─ DATABASE_SCHEMA.md
├─ DEVELOPMENT_WORKFLOW.md
├─ TESTING_PLAN.md
├─ ROADMAP.md
├─ WORKTREE_STRUCTURE.md
├─ docs/
│  ├─ UI_UX_GUIDE.md
│  ├─ SECURITY_AND_POLICY.md
│  ├─ PROJECT_OUTPUT_LOCATION.md
│  ├─ UI_UX_GUIDE.md
│  ├─ SECURITY_AND_POLICY.md
│  ├─ SECRETS_PROTOCOL.md
│  ├─ USER_SETUP_GUIDE.md
│  ├─ ENVIRONMENT_VARIABLES.md
│  ├─ SUPABASE_SETUP.md
│  ├─ SUPABASE_RLS_POLICY.md
│  ├─ GOOGLE_OAUTH_SETUP.md
│  ├─ VERCEL_SETUP.md
│  ├─ LOCAL_DEV_CHECKLIST.md
│  └─ FASTAPI_WORKER_PLAN.md
├─ supabase/
│  ├─ schema.sql
│  └─ rls_policies.sql
├─ prompts/
│  ├─ frontend-agent.md
│  ├─ backend-agent.md
│  ├─ worker-agent.md
│  ├─ supabase-agent.md
│  ├─ uiux-agent.md
│  ├─ security-agent.md
│  └─ reviewer-agent.md
├─ scripts/
│  └─ check-env.example.ts
└─ examples/
   └─ .env.example
```

---

## For AI Agents

Before writing code, read these files in order:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `TODO.md`
4. `ARCHITECTURE.md`
5. `WORKTREE_STRUCTURE.md`
6. `docs/PROJECT_OUTPUT_LOCATION.md`
7. `docs/SECRETS_PROTOCOL.md`
8. `docs/SECURITY_AND_POLICY.md`
9. `docs/UI_UX_GUIDE.md`

Do not start implementation before understanding the project rules.

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

## Recommended Build Order

1. Create monorepo structure
2. Initialize Next.js app
3. Configure dark UI system
4. Connect Supabase Auth
5. Create Supabase schema and RLS
6. Build dashboard and URL analyzer UI
7. Build FastAPI policy/analyze API in local Docker
8. Create job records in Supabase
9. Add Python worker structure
10. Add yt-dlp/FFmpeg processing safely
11. Use local temporary output by default; optional Supabase Storage upload later
12. Add history and signed download links
13. Add tests and final review

---

## Development Principle

Keep the application simple, private, safe, and understandable.

The goal is not to build the most aggressive downloader. The goal is to build a clean, rights-aware media utility that teaches modern full-stack architecture and AI-assisted development.

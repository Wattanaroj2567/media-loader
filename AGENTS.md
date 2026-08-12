# AGENTS.md

This file defines the central rules for every AI Agent working on the Media Loader project.

All agents must read this file before making changes.

---

## Project Identity

Media Loader is a personal, rights-aware media loading web application for daily use.

The goal is a reliable private tool the owner can run locally and deploy for real downloads, conversion, and history — not a tutorial project.

The application must use:

- Next.js frontend deployed to Vercel
- Supabase Auth with Google login
- Supabase PostgreSQL
- Supabase Storage
- FastAPI backend service
- Separate Python media worker for heavy processing
- yt-dlp in restricted mode where appropriate
- FFmpeg for allowed media conversion
- Modern dark UI with real icon libraries, not emoji

---

## Project Root

This repository **is** the application. Source code lives at the repo root:

```text
apps/web/      → Next.js frontend
apps/api/      → FastAPI backend
apps/worker/   → Python media worker
supabase/      → schema and migrations
docs/          → architecture and setup guides
```

Do not create a nested `./media-loader` copy. Edit files in place under this repo root.

Before making changes, confirm you are in the repository root and that `apps/` exists.

---

## Product Goal

Build a private web app that lets the user:

1. Sign in with Google
2. Paste a media URL
3. Analyze the URL
4. Check whether processing is allowed
5. Select available video/audio quality
6. Queue a download or conversion job
7. Track progress
8. Store the output file
9. View private download history

---

## Non-Negotiable Policy

This project must not bypass protections.

Never implement features that:

- Bypass DRM
- Bypass login walls
- Download private content without permission
- Use browser cookies to access restricted content
- Circumvent age gates, geo restrictions, paywalls, or platform protections
- Encourage copyright infringement
- Hide source platform terms from the user

Every URL must pass a policy check before analysis or download.

The correct flow is:

```text
URL input → URL validation → policy check → analysis → rights confirmation → job queue → worker processing
```

Never implement:

```text
URL input → direct download
```

---

## Secret Handling Rules

Agents must never ask the user to paste secrets into chat.

Agents must never print secret values.

Agents may only:

- Create `.env.example`
- Tell the user where to get a key
- Tell the user which variable name to use
- Ask the user to add keys locally
- Validate whether variables exist
- Report `OK`, `Missing`, or `Invalid`

Agents must never:

- Run `cat .env.local`
- Print `.env` values
- Commit `.env.local`
- Put `SUPABASE_SERVICE_ROLE_KEY` in frontend code
- Put Google client secret in browser code
- Log secrets in console output

---

## UI/UX Rules

The UI must be:

- Dark modern
- Clean
- Minimal but premium
- Utility-dashboard style
- Responsive
- Easy to understand

Do not use emoji as icons.

Use a real icon library such as:

- Lucide React
- Tabler Icons

Avoid:

- Pastel-heavy palettes
- Overly colorful gradients
- Purple-heavy futuristic themes
- Cute or childish styling
- Emoji-based status indicators

Preferred visual direction:

```text
Dark command center
Neutral black/gray surfaces
Subtle borders
Sharp spacing
Restrained blue/cyan/green accent
Clear text hierarchy
```

---

## Architecture Rules

Use clear separation of responsibilities.

### Frontend

Frontend handles:

- UI
- Forms
- Auth session
- Supabase browser client
- API calls
- Progress display
- History display

Frontend must not:

- Run yt-dlp
- Run FFmpeg
- Use service role key
- Perform heavy media processing

### FastAPI

FastAPI handles:

- URL validation
- Policy checks
- Metadata analysis orchestration
- Job creation
- Secure server-side operations

### Worker

Worker handles:

- Queue polling
- Download execution
- FFmpeg conversion/merge
- Supabase Storage upload
- Job status updates
- Temp file cleanup

### Supabase

Supabase handles:

- Google Auth
- PostgreSQL data storage
- Storage bucket
- Row Level Security
- Optional Realtime updates

---

## Work Style Rules

Before coding:

1. Inspect relevant technical specifications in `docs/` (`docs/ARCHITECTURE.md`, `docs/API_SPEC.md`, `docs/DATABASE_SCHEMA.md`, `docs/SECURITY_AND_POLICY.md`, `docs/USER_SETUP_GUIDE.md`) for quick context.
2. Inspect the existing structure.
3. Identify the smallest useful change.
4. Add or update docs if behavior changes.
5. Run verification commands when possible.

### Quick Documentation Map for Agents

When needing deep domain information, read these files in `docs/`:
- `docs/ARCHITECTURE.md` — Overall system blueprint and flow.
- `docs/API_SPEC.md` — FastAPI endpoints and request/response specifications.
- `docs/DATABASE_SCHEMA.md` — Supabase database tables and relationships.
- `docs/SECURITY_AND_POLICY.md` — Non-bypass URL validation and policy enforcement rules.
- `docs/SUPABASE_RLS_POLICY.md` — Row Level Security policies.
- `docs/USER_SETUP_GUIDE.md` — Local & Cloud environment setup guide.
- `docs/ENVIRONMENT_VARIABLES.md` — Environment variable definitions.
- `docs/GOOGLE_OAUTH_SETUP.md` — Google OAuth setup instructions.
- `docs/VERCEL_SETUP.md` — Frontend Vercel deployment guide.
- `docs/SECRETS_PROTOCOL.md` — Zero-secret leakage handling protocol.

Do not introduce unrelated features.

Do not silently change the stack.

Do not skip security/policy checks.

Do not rewrite large unrelated files without reason.

### Package Manager Rules

- Never use `pip` in this project for Python package management or environment creation.
- Always use `uv` for Python package installation, virtual environment management, and running scripts (`uv venv`, `uv pip install`, `uv run`).
- Always use `pnpm` for Node.js package management and script execution.

---

## Naming Rules

Use clear, boring, maintainable names.

Good names:

- `download_jobs`
- `profiles`
- `policy_logs`
- `analyzeMediaUrl`
- `createDownloadJob`
- `updateJobStatus`

Avoid vague names:

- `data`
- `thing`
- `handler2`
- `magicDownload`
- `superBypass`

---

## Status Model

Use these status values consistently:

```text
PENDING
ANALYZING
READY
QUEUED
DOWNLOADING
CONVERTING
UPLOADING
COMPLETED
FAILED
BLOCKED
CANCELLED
```

---

## Definition of Done

A task is done only when:

- The code matches the architecture
- The UI follows the design guide
- Secrets are not exposed
- Policy checks are not bypassed
- Errors are handled clearly
- The user-facing behavior is understandable
- Relevant docs are updated
- Manual verification steps are provided

---

## Final Reminder

This project is for personal daily use and safe media management.

Prioritize features that make the app usable end-to-end (worker, downloads, history). Do not turn it into a generic unrestricted downloader.


---

## Local Docker Backend Rules

- FastAPI backend must run locally through Docker during development.
- Python media worker must run locally through Docker during development.
- Create `docker-compose.yml`, `apps/api/Dockerfile`, `apps/worker/Dockerfile`, and `.dockerignore` when implementing backend phases.
- Do not put yt-dlp, FFmpeg, or media processing inside Vercel Functions.
- Do not put media processing inside Supabase Edge Functions.
- Do not bake secrets into Docker images.
- Read runtime values from `.env.local`, but never print the values.
- Use local temporary media output as the default Free tier behavior.
- Supabase Storage upload is optional and must not be the initial default for large media files.
- The frontend should call `NEXT_PUBLIC_FASTAPI_BASE_URL`, defaulting to `http://localhost:8000` in local development.

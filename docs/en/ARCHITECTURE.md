# Architecture

## Overview

Media Loader uses a split architecture so each layer does the right job.

```text
apps/web      → Next.js frontend on Vercel
apps/api      → FastAPI service for policy, analysis, and job creation, running locally in Docker
apps/worker   → Python worker for heavy media processing, running locally in Docker
supabase      → Auth, PostgreSQL, Storage, RLS
```

Full architecture diagrams available at [docs/diagrams/media-loader-architecture.html](../diagrams/media-loader-architecture.html) (or [Dark Mode](../diagrams/media-loader-architecture-dark.html)).

---

## Local Docker Backend

During development, the backend API and worker run through Docker Compose from the **repository root** (the folder that contains `apps/` and `docker-compose.yml`).

```text
Next.js on Vercel or local dev → calls http://localhost:8000
FastAPI API container          → exposes port 8000
Worker container               → processes queued jobs and temporary files
Supabase Cloud                 → Auth, database, RLS, and optional future/cloud storage
```

Required files in the implementation project:

```text
docker-compose.yml
apps/api/Dockerfile
apps/worker/Dockerfile
.dockerignore
```

See `docs/LOCAL_DOCKER_BACKEND.md`.

---

## Why Split the Worker?

Media processing can be slow and resource-heavy.

The worker handles:

- yt-dlp calls
- FFmpeg processing
- Temporary files
- Serving or preparing local temporary outputs for download
- Progress updates

This avoids putting heavy tasks inside Vercel Functions or Supabase Edge Functions.

---

## Request Flow

### Login

```text
User → Next.js → Supabase Auth → Dashboard
```

### Analyze URL

```text
User submits URL
  ↓
Next.js calls FastAPI `/media/analyze`
  ↓
FastAPI validates URL
  ↓
FastAPI runs policy check
  ↓
FastAPI extracts safe metadata when allowed
  ↓
FastAPI returns metadata and format options
```

The frontend must send the current Supabase access token. FastAPI verifies it and scopes analysis logs, queue actions, file access, and account deletion to that user.

### Create Job

```text
User selects format
  ↓
Next.js calls FastAPI `/downloads`
  ↓
FastAPI validates selection
  ↓
FastAPI inserts row in `download_jobs`
  ↓
FastAPI marks the target worker pool (`pool:local` or `pool:cloud`)
  ↓
Only a worker in that pool picks the queued job
```

Queue affinity is required in local-temp mode because local and cloud (Oracle Cloud / VPS)
workers can share Supabase but cannot read each other's filesystems.

### Process Job

```text
Worker locks job
  ↓
Worker downloads allowed media
  ↓
Worker converts/merges with FFmpeg
  ↓
Worker writes output to local temp storage by default
  ↓
Worker updates job status to COMPLETED
```

### Download File

```text
User clicks download
  ↓
Desktop opens the same-origin `/api/files/download/{job_id}` route
  ↓
Next.js authenticates from the session cookie and streams FastAPI's response
  ↓
Chrome saves automatically or shows Save As according to its own settings
  ↓
FastAPI deletes the temp file and clears the file path; history metadata remains
```

On iOS and Android, completed jobs show a mobile-only choice. Native sharing
uses a fetched `File` object so the OS share sheet can offer Photos/Files;
regular download uses the same streaming route as desktop. A pending delivery
owns its completion notification, preventing overlapping polls from showing
duplicate toasts.

---

## Core Components

### Next.js Web

Responsibilities:

- Auth UI
- Dashboard UI
- URL form
- Format selection
- Job status display
- History page
- Settings page

### FastAPI

Responsibilities:

- Validate user session where needed
- Validate URLs
- Run policy decision
- Normalize metadata
- Create download jobs
- Stream completed local temp files to the signed-in owner
- Delete account data and local temporary outputs

### Worker

Responsibilities:

- Poll queued jobs
- Process one job safely
- Update progress
- Save output file to local temp storage by default
- Clean temporary files

### Supabase

Responsibilities:

- Auth
- User profile
- Job records
- Policy logs
- Media format records
- Optional Storage bucket for future/cloud mode
- RLS policies

---

## Data Ownership

Every user-owned row must include `user_id`.

RLS lets users read only their own server-managed records. Queue, format, and
policy-log mutations are intentionally denied to browser clients so they cannot
bypass FastAPI policy checks; trusted API/worker services perform those writes.

The service role key may bypass RLS but must only exist in trusted server-side contexts.

---

## Status Lifecycle

```text
PENDING → ANALYZING → READY → QUEUED → DOWNLOADING → CONVERTING → UPLOADING → COMPLETED
```

Failure paths:

```text
ANY_STATUS → FAILED
ANY_STATUS → BLOCKED
QUEUED/DOWNLOADING/CONVERTING → CANCELLED
```

---

## Important Constraints

- Frontend must not perform media processing
- Frontend must not contain service role key
- Worker must not run inside browser
- URLs must be validated before network access
- Policy decision must be stored for auditability
- Completed files are local temporary files by default and must be owner-scoped
- Permanent cloud media storage must not be the Free tier default
- Local Docker backend must handle media processing and temporary files

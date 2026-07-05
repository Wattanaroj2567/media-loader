# Architecture

## Overview

Media Loader uses a split architecture so each layer does the right job.

```text
apps/web      → Next.js frontend on Vercel
apps/api      → FastAPI service for policy, analysis, and job creation, running locally in Docker
apps/worker   → Python worker for heavy media processing, running locally in Docker
supabase      → Auth, PostgreSQL, Storage, RLS
```


---

## Local Docker Backend

During development, the backend API and worker are expected to run through Docker Compose from the real project root `./media-loader`.

```text
Next.js on Vercel or local dev → calls http://localhost:8000
FastAPI API container          → exposes port 8000
Worker container               → processes queued jobs and temporary files
Supabase Cloud                 → Auth, database, RLS, and optional small/temporary storage
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
- Uploading completed files when cloud storage mode is enabled
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
Worker picks queued job
```

### Process Job

```text
Worker locks job
  ↓
Worker downloads allowed media
  ↓
Worker converts/merges with FFmpeg
  ↓
Worker writes output to local temp storage by default; optional cloud mode uploads to Supabase Storage
  ↓
Worker updates job status to COMPLETED
```

### Download File

```text
User clicks download
  ↓
Next.js requests a download action
  ↓
FastAPI returns a local download response or optional signed Storage URL
  ↓
User downloads file to device
```

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
- Generate signed file access helpers if needed

### Worker

Responsibilities:

- Poll queued jobs
- Process one job safely
- Update progress
- Save output file to local temp storage by default
- Upload output file only if cloud storage mode is enabled
- Clean temporary files

### Supabase

Responsibilities:

- Auth
- User profile
- Job records
- Policy logs
- Media format records
- Storage bucket
- RLS policies

---

## Data Ownership

Every user-owned row must include `user_id`.

RLS must ensure users can only read and modify their own records.

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
- Completed files should be private by default
- Permanent cloud media storage must not be the Free tier default
- Local Docker backend must handle media processing and temporary files

# FastAPI and Worker Plan

## Why FastAPI?

FastAPI is used for API logic that should not live in the frontend.

Responsibilities:

- URL validation
- Policy check
- Metadata analysis orchestration
- Job creation
- Safe server-side checks

---

## Why Separate Worker?

Media processing is heavy.

The worker handles:

- Download jobs
- yt-dlp calls
- FFmpeg conversion
- Local temp output by default
- Optional Supabase Storage upload only if cloud mode is enabled later
- Job progress updates

This should not run inside Vercel frontend functions.

---

## Initial Local Development

Run API locally:

```bash
cd apps/api
uvicorn app.main:app --reload
```

Run worker locally:

```bash
cd apps/worker
python -m worker.main
```

---

## Future Cloud Options

When ready, deploy API/worker to one of:

- Railway
- Fly.io
- Google Cloud Run
- VPS

---

## Worker Job Locking

Worker should safely claim jobs.

Basic approach:

```text
1. Find QUEUED job
2. Set status to DOWNLOADING
3. Set locked_by and locked_at
4. Process job
5. Update status progressively
6. Complete or fail safely
```

Avoid two workers processing the same job.

---

## Worker Status Updates

Update `download_jobs`:

```text
QUEUED
DOWNLOADING
CONVERTING
UPLOADING
COMPLETED
FAILED
CANCELLED
```

---

## Error Handling

Worker must:

- Store safe error message
- Avoid secret logs
- Clean temp files
- Mark job as failed
- Keep enough metadata for debugging

---

## Restricted yt-dlp Rules

Do not use:

- cookies
- login bypass
- DRM bypass
- private content extraction

Use:

- timeouts
- controlled output paths
- sanitized filenames
- format restrictions
- safe error handling

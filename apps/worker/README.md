# Media Loader Worker

Python media processing worker daemon for Media Loader. It continuously polls queued
download jobs from Supabase PostgreSQL, downloads media using yt-dlp with strict security
sandboxing, performs FFmpeg audio/video transcoding, tracks real-time progress, and stores
output files in local temp storage or Supabase Storage.

## Development

Run commands from the repository root:

```bash
pnpm dev:worker
pnpm lint:worker
pnpm test:worker
```

Or run directly with `uv` inside `apps/worker`:

```bash
uv run python -m worker.main
uv run pytest
uv run ruff check .
```

Use `pnpm dev` when the web app, API, and worker should run together.

## Key Paths

- `worker/main.py` — Daemon worker process loop and graceful shutdown handlers
- `worker/job_queue.py` — Database queue polling, job claiming, and status updates
- `worker/processor.py` — Media download orchestration, yt-dlp hooks, and FFmpeg transcoding
- `worker/cleanup.py` — Expired file cleanup and temp storage management
- `worker/supabase_client.py` — Authenticated Supabase service client for queue mutations
- `tests/` — Worker lifecycle and processor unit tests

## Processing Rules & Guardrails

- **Queue Polling**: Polls for `queued` jobs, transitions state through `downloading` -> `processing` -> `completed` (or `failed`).
- **Sandboxed Execution**: Subprocesses for yt-dlp and FFmpeg enforce strict timeouts, restricted options, and non-bypass flags.
- **Output Management**: Files are written to a shared temp directory (`media_downloads/`) or uploaded to storage buckets with periodic cleanup.

## Documentation

- [Developer Guide](../../docs/en/DEVELOPER_GUIDE.md)
- [System Architecture](../../docs/en/ARCHITECTURE.md)
- [Database Schema](../../docs/en/DATABASE_SCHEMA.md)
- [Security and Policy](../../docs/en/SECURITY_AND_POLICY.md)
- [Environment Variables](../../docs/en/ENVIRONMENT_VARIABLES.md)

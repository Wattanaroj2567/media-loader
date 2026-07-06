# Patch Notes

> **Historical.** The repo now lives at the root; nested `./media-loader` is deprecated. See `docs/PROJECT_OUTPUT_LOCATION.md` and ADR 02 in `docs/DECISION_LOG.md`.

These notes cover the shift to a local Docker backend runtime.

## Main Changes

- Backend API now defaults to FastAPI running locally through Docker Compose.
- Media worker now defaults to Python worker running locally through Docker Compose.
- Vercel remains frontend-only.
- Supabase remains Auth, PostgreSQL, RLS, and optional small/temporary Storage.
- Supabase Storage is no longer the default location for large completed media files on Free tier.
- Local temporary media output is now the recommended initial mode.

## New Files

- `docs/LOCAL_DOCKER_BACKEND.md`
- `examples/docker-compose.local.yml`
- `examples/apps-api.Dockerfile`
- `examples/apps-worker.Dockerfile`
- `examples/.dockerignore.example`

## Safe Upgrade Note

If you still have an old nested `./media-loader` copy from earlier layouts, migrate any local changes into the repo root and remove the duplicate. The canonical project is the repository root.

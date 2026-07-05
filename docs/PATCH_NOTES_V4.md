# Patch Notes v4

This version updates the work package to use a local Docker backend runtime.

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

If an Agent has already created `./media-loader`, do not delete that folder.

Copy updated planning docs into the existing workspace or ask the Agent to sync the v4 docs carefully.

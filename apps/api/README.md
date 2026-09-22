# Media Loader API

FastAPI backend service (Python 3.12) for Media Loader. It owns server-side URL validation,
SSRF protection, platform rights-aware policy enforcement, media metadata extraction via yt-dlp,
job creation, and authenticated file download token validation. Media analysis and job mutations
always go through FastAPI; client browsers do not write queue or policy records directly.

## Development

Run commands from the repository root:

```bash
pnpm dev:api
pnpm lint:api
pnpm test:api
```

Or run directly with `uv` inside `apps/api`:

```bash
uv run uvicorn app.main:app --reload --port 8000
uv run pytest
uv run ruff check .
```

Use `pnpm dev` when the web app, API, and worker should run together.

## Key Paths

- `app/main.py` — FastAPI application entry point, CORS, and middleware
- `app/url_policy.py` — SSRF safety checks and platform rights-aware policy rules
- `app/yt_dlp_service.py` — Media metadata extraction with restricted yt-dlp parameters
- `app/job_service.py` — Download job lifecycle, validation, and queue creation
- `app/routers/` — Endpoint routers (`media`, `downloads`, `files`, `account`, `health`)
- `app/auth.py` — Supabase JWT verification and guest session management
- `tests/` — Pytest unit and route integration tests

## Security & Policy Guardrails

- **Strict Non-Bypass**: Never circumvent DRM, login walls, or paywalls. No browser cookies.
- **SSRF Prevention**: All input URLs are validated against private IP ranges, local networks, and disallowed schemes before resolution.
- **Restricted yt-dlp Execution**: Subprocess parameters are strictly whitelisted and never pass raw user strings directly to a shell.

## Documentation

- [Developer Guide](../../docs/en/DEVELOPER_GUIDE.md)
- [API Specification](../../docs/en/API_SPEC.md)
- [System Architecture](../../docs/en/ARCHITECTURE.md)
- [Security and Policy](../../docs/en/SECURITY_AND_POLICY.md)
- [Environment Variables](../../docs/en/ENVIRONMENT_VARIABLES.md)

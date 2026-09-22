# Environment Variables

> **Language:** **English** · [ภาษาไทย](../th/ENVIRONMENT_VARIABLES.md)

Use `.env.example` for placeholders only.

Use `.env.local` for real local values.

Never commit real secrets.

---

## Frontend Variables

These can be used by Next.js client code:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

These are public-facing config values. Do not place private secrets in variables starting with `NEXT_PUBLIC_`.

---

## Backend Variables

Used by FastAPI only:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=
CORS_ORIGINS=
```

---

## Worker Variables

Used by Python worker only:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MEDIA_STORAGE_BUCKET=media-downloads
WORKER_SECRET=
WORKER_ID=local-worker-1
WORKER_POOL=local
NODE_PATH=
DENO_PATH=
FFMPEG_PATH=
MAX_FILE_SIZE_MB=500
TEMP_DIR=tmp/media-loader
```

`TEMP_DIR` is resolved from the repository root by both the API and worker.
Keep it identical for both services; Docker shares it through `/app/tmp`.

`WORKER_POOL` isolates queues by runtime so separate workers cannot claim a
job whose output is stored on another filesystem. Defaults to `local`.

`NODE_PATH`, `DENO_PATH`, and `FFMPEG_PATH` are optional overrides. The worker
prefers Deno, otherwise discovers Node from `PATH`, and falls back to its
managed FFmpeg binary automatically. Deployment images include Deno and the
locked worker dependencies needed by yt-dlp's YouTube JavaScript solver.

---

## Optional Variables

```env
LOG_LEVEL=info

# Cloudflare Tunnel (When connecting local Docker backend to Vercel frontend via HTTPS)
CLOUDFLARE_TUNNEL_TOKEN=
TUNNEL_TOKEN=
```

`CLOUDFLARE_TUNNEL_TOKEN` / `TUNNEL_TOKEN` stores your Cloudflare Zero Trust Named Tunnel token. If left blank, Docker automatically launches a temporary Quick Tunnel on `trycloudflare.com`.

---

## Validation Rules

The validation script must check:

- variable exists
- variable is not empty
- public variable is not accidentally set to a service role key pattern
- service role key is not available in frontend bundle

The script must not print actual values.

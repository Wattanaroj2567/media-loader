# Environment Variables

> **Language:** **English** · [ภาษาไทย](../th/ENVIRONMENT_VARIABLES.md)

Use `.env.example` for placeholders and `.env.local` for real local values.
Never commit real secrets.

## Variables required by `pnpm check-env`

The current checker requires these names to be present:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_FASTAPI_BASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
MEDIA_URL_ENCRYPTION_KEY
MEDIA_EGRESS_PROXY
DATABASE_URL
WORKER_SECRET
```

`pnpm check-env` checks for missing values and applies a simple service-role
pattern check to public variables. It does not inspect the built frontend
bundle. A successful result must not be treated as proof that no secret was
bundled.

## Browser-visible frontend variables

Next.js exposes variables prefixed with `NEXT_PUBLIC_` to browser code. Use only
public configuration here:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

Set `NEXT_PUBLIC_FASTAPI_BASE_URL` to the reachable HTTPS API URL in a deployed
environment. A localhost URL is only for local development.

## Database tooling

`DATABASE_URL` is used by Drizzle Kit commands such as `db:push` and
`db:generate`. Keep it in local or deployment tooling environments; never
expose it to browser code.

## API and worker settings

FastAPI and the worker use the same Supabase project and shared output directory:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MEDIA_URL_ENCRYPTION_KEY=
MEDIA_EGRESS_PROXY=http://127.0.0.1:3128
MEDIA_OUTPUT_MODE=local_temp
TEMP_DIR=tmp/media-loader
MAX_FILE_SIZE_MB=500
TEMP_FILE_RETENTION_MINUTES=60
WORKER_POOL=
RAILWAY_ENVIRONMENT_ID=
LOG_LEVEL=info
```

- `TEMP_DIR` must resolve to the same shared directory for the API and worker.
  Docker Compose mounts the named output volume into both containers.
- `MAX_FILE_SIZE_MB` defaults to `500`.
- `TEMP_FILE_RETENTION_MINUTES` defaults to `60`.
- `MEDIA_OUTPUT_MODE` defaults to `local_temp`; changing it does not enable
  cloud-file storage.
- `WORKER_POOL` should match between the API and workers that share a queue.
  It defaults to `local` unless `RAILWAY_ENVIRONMENT_ID` selects the Railway
  pool.
- `LOG_LEVEL` defaults to `info`.
- `MEDIA_URL_ENCRYPTION_KEY` is required to create jobs. Generate one with
  `uv run --directory apps/api python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
  Set the same key on the API and worker, keep a protected backup, and never put
  it in a `NEXT_PUBLIC_` variable. Losing or changing the key prevents old
  encrypted job URLs from being decrypted.
- `MEDIA_EGRESS_PROXY` points API and worker URL requests to the SSRF proxy. Its
  local default is `http://127.0.0.1:3128`; Docker Compose sets the internal
  service address automatically. For local `pnpm dev`, start the proxy first:
  `docker compose up -d --build ssrf-proxy`. Deployments outside Compose must
  provide an equivalent DNS-validating proxy and prevent direct egress around it.

### Migrate existing URL rows

Deploy the new worker first, then the API, with the same encryption key on both.
The new worker can still process legacy plaintext jobs during this rollout. Once
both services run the new version, run this once to encrypt legacy job URLs and
redact old policy-log URLs:

```bash
uv run --directory apps/api python -m app.url_storage_migration
```

The command prints only row counts. Until it completes, pre-existing job URLs
remain plaintext in the database.

The current default output mode is `local_temp`. Cloud Storage configuration
fields exist in service settings, but a complete cloud-output path is not
implemented; do not treat setting a bucket name as enabling that mode.

## API settings

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Add the exact deployed frontend origin to `CORS_ORIGINS`. Separate multiple
origins with commas.

## Worker settings

```env
WORKER_ID=local-worker-1
WORKER_SECRET=
POLL_INTERVAL_SECONDS=5
NODE_PATH=
DENO_PATH=
FFMPEG_PATH=
MEDIA_STORAGE_BUCKET=media-downloads
```

- `WORKER_ID` defaults to `local-worker-1`.
- `POLL_INTERVAL_SECONDS` defaults to `5` and controls how often the worker
  polls for jobs.
- `DENO_PATH` and `NODE_PATH` optionally select the JavaScript runtime used by
  yt-dlp. Deno is preferred; otherwise the worker looks for Node on `PATH`.
- `FFMPEG_PATH` optionally points to FFmpeg. The worker otherwise uses FFmpeg
  on `PATH` or its managed Python package binary.
- `WORKER_SECRET` is required by the environment checker but is not currently
  used to authenticate workers.
- `MEDIA_STORAGE_BUCKET` is a configuration field but does not enable cloud
  file storage. `JOB_TIMEOUT_MINUTES` is also defined in worker settings but is
  not currently enforced.

`API_PORT` is defined as `8000`, but the current development and Compose launch
commands use port `8000` directly; changing the variable alone does not change
the listening port.

## Cloudflare Tunnel

The Compose tunnel service reads `TUNNEL_TOKEN` from `.env.local` when using a
remotely-managed tunnel. Leave it unset for the temporary Quick Tunnel command.

```env
TUNNEL_TOKEN=
```

Never put a tunnel token in frontend variables, source code, or logs.

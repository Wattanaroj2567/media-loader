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
LOG_LEVEL=info
```

- `TEMP_DIR` must resolve to the same shared directory for the API and worker.
  Docker Compose mounts the named output volume into both containers.
- `MAX_FILE_SIZE_MB` defaults to `500`.
- `TEMP_FILE_RETENTION_MINUTES` defaults to `60`.
- `MEDIA_OUTPUT_MODE` defaults to `local_temp`; changing it does not enable
  cloud-file storage.
- `WORKER_POOL` should match between the API and workers that share a queue.
  It defaults to `local`.
- `LOG_LEVEL` defaults to `info`.
- `MEDIA_URL_ENCRYPTION_KEY` is required to create jobs. Generate one with
  `uv run --directory apps/api python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
  Set the same key on the API and worker, keep a protected backup, and never put
  it in a `NEXT_PUBLIC_` variable. Losing or changing the key prevents old
  encrypted job URLs from being decrypted.
- `MEDIA_EGRESS_PROXY` points API and worker URL requests to the SSRF proxy. Its
  local default is `http://127.0.0.1:3128`; Docker Compose sets the internal
  service address automatically. `pnpm dev` starts a local proxy on that
  address (`pnpm dev:proxy` starts it alone). Deployments outside Compose must
  provide an equivalent DNS-validating proxy and prevent direct egress around it.

### Web Push notifications

These optional server-side settings enable notifications when a browser tab is
closed or suspended. Keep one VAPID key pair stable across deployments. The API
uses the public key to create subscriptions; the worker uses the matching
public/private pair to send pushes through `MEDIA_EGRESS_PROXY`.

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:push-operations@example.com
```

Use URL-safe Base64 VAPID key values. The public key must decode to an
uncompressed 65-byte P-256 key; the private key must decode to its 32-byte
scalar. Keep `VAPID_PRIVATE_KEY` only in trusted worker deployment secrets,
never in `NEXT_PUBLIC_` variables. Set `VAPID_PUBLIC_KEY` on the API and worker;
set `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` on the worker only. Docker Compose
masks the private key from the API container even though both services use the
same environment file. The subject is a contact URI such as
`mailto:push-operations@example.com`. Keep the key pair stable; users must
subscribe again if it changes. Leave these settings empty to disable Web Push.

Before enabling push in a deployment, apply the generated Drizzle migration for
`push_subscriptions` and the RLS change in `supabase/rls_policies.sql`. The API
and worker use the service role to manage subscription rows; browser clients
have no direct table policy.

On iPhone or iPad, open Media Loader in Safari, choose **Share → Add to Home
Screen**, then open the installed app and enable notifications there. Web Push
requires the app manifest, Push API, Notifications API, and service worker; a
normal Safari tab cannot receive reliable notifications while suspended.

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

The Compose tunnel service runs a remotely-managed tunnel and reads
`TUNNEL_TOKEN` from `.env.local`. A Quick Tunnel needs no token but requires
changing the tunnel command; see the Cloudflare Tunnel guide.

```env
TUNNEL_TOKEN=
```

Never put a tunnel token in frontend variables, source code, or logs.

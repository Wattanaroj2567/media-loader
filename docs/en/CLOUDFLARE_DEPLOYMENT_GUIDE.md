# Cloudflare Deployment & R2 Setup Guide

> **Language:** **English** · [ภาษาไทย](../th/CLOUDFLARE_DEPLOYMENT_GUIDE.md)

This guide covers Level 1 Cloudflare deployment for Media Loader:

1. **Frontend (`apps/web`) on Cloudflare Workers** using `vinext` and `@cloudflare/vite-plugin`.
2. **Direct file delivery via Cloudflare R2** (`MEDIA_OUTPUT_MODE=r2`) while keeping `apps/api`, `apps/worker`, and `apps/proxy` on Docker Compose and **Supabase** for Auth and PostgreSQL.

---

## Architecture

```text
Browser
  ├─▶ Cloudflare Workers (apps/web via vinext)
  ├─▶ Cloudflare Tunnel → Docker FastAPI (apps/api) → Supabase
  │                         └─ issues short-lived R2 presigned URL
  └─◀ direct download (zero egress) ── Cloudflare R2 (private bucket)
                                           ▲
                                           │ upload & auto-cleanup
                                     Docker Worker (apps/worker)
```

Using R2 for completed outputs avoids serving large media files through Cloudflare Tunnel or serverless web functions and removes egress bandwidth bottlenecks.

---

## Part 1: Configure Cloudflare R2 (Direct File Delivery)

### 1. Create a private R2 bucket

1. Open **Cloudflare Dashboard → R2 Object Storage → Create bucket**.
2. Name the bucket (for example `media-downloads`).
3. Keep public access **disabled** — Media Loader serves files exclusively through owner-checked, short-lived presigned URLs issued by FastAPI.

### 2. Configure Bucket CORS

In **Bucket Settings → CORS Policy**, allow browser `GET` and `HEAD` requests (required for `showSaveFilePicker` and mobile resumable `Range` transfers):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-web-domain.workers.dev"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Content-Disposition", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace `https://your-web-domain.workers.dev` with your deployed frontend origin(s).

### 3. Add a Lifecycle Rule (Safety Net)

In **Bucket Settings → Object lifecycle rules**, add a rule to delete objects under prefix `jobs/` after **1 day**. The worker also deletes expired objects every cleanup cycle based on `TEMP_FILE_RETENTION_MINUTES` (default `60`).

### 4. Create an R2 API Token

1. Go to **R2 Object Storage → Manage R2 API Tokens → Create API Token**.
2. Grant **Object Read & Write** scoped to the `media-downloads` bucket only.
3. Copy the **Account ID**, **Access Key ID**, and **Secret Access Key** into the backend `.env.local` (never into frontend variables):

```env
MEDIA_OUTPUT_MODE=r2
MEDIA_STORAGE_BUCKET=media-downloads
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_PRESIGNED_URL_TTL_SECONDS=300
```

4. Restart the Docker stack so both `api` and `worker` load the updated environment:

```bash
docker compose up -d --build api worker
```

---

## Part 2: Deploy `apps/web` to Cloudflare Workers

### Local preview and build

From the repository root:

```bash
# Build the Cloudflare Workers bundle (apps/web/dist)
pnpm build:web:cf

# Deploy using Cloudflare CLI / Wrangler (requires authenticated Cloudflare account)
pnpm deploy:web:cf
```

### Environment variables on Cloudflare Workers

Set these **public build variables** in **Workers & Pages → `media-loader` →
Settings → Build → Build Variables and Secrets**, or provide them to your CI
build. Vinext inlines `NEXT_PUBLIC_*` when it builds the app. Rebuild and
redeploy after changing them.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
NEXT_PUBLIC_FASTAPI_BASE_URL=https://api.yourdomain.com
```

Never add `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MEDIA_URL_ENCRYPTION_KEY`, or `DATABASE_URL` to Cloudflare Workers frontend variables.

### Post-deploy checklist

1. **Supabase Auth:** Add your Workers origin to **Site URL** and **Redirect URLs**:
   - `https://your-web-domain.workers.dev/auth/callback`
   - `https://your-web-domain.workers.dev/auth/callback?next=/auth/reset-password`
2. **Backend CORS:** Add the exact Workers origin to `CORS_ORIGINS` in the
   backend `.env.local`, keeping existing origins. Run
   `docker compose up -d --force-recreate api worker` to load the updated configuration.
3. **R2 CORS:** Confirm the Workers origin is listed in the R2 bucket's CORS policy.
4. **Verify end-to-end:** Sign in, analyze an authorized URL, queue a job, confirm the status transitions through `UPLOADING → COMPLETED`, and verify the browser downloads directly from `*.r2.cloudflarestorage.com`.

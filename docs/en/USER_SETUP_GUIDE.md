# User Setup Guide

[English](USER_SETUP_GUIDE.md) | [ภาษาไทย](../th/USER_SETUP_GUIDE.md)

First-time setup to run Media Loader for **real use** on your machine.

Follow these steps once. Add all secret values yourself in `.env.local` — never commit or expose secret credentials in logs.

---

## Step 1 — Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project named `media-loader`
3. Save your database password securely
4. Wait until project provisioning is complete

After this step, gather the following credentials from Supabase Project Settings:

```text
Project URL
Anon public key
Service role key
Database connection string
```

---

## Step 2 — Add Supabase Values Locally

1. Copy the example environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and populate the required keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```

3. Validate environment configuration without exposing secret values:
   ```bash
   pnpm check-env
   ```

---

## Step 3 — Configure Google OAuth for Supabase Auth

For detailed Google Cloud setup, refer to [`GOOGLE_OAUTH_SETUP.md`](GOOGLE_OAUTH_SETUP.md).

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Configure OAuth consent screen
4. Create OAuth 2.0 Client ID (Web Application)
5. Add authorized redirect URI from Supabase Auth settings (`https://<project-ref>.supabase.co/auth/v1/callback`)
6. Copy Client ID and Client Secret
7. Paste credentials into Supabase Dashboard: **Authentication** → **Providers** → **Google** → Toggle **Enabled**

---

## Step 4 — Configure Supabase Redirect URLs

In Supabase Dashboard → **Authentication** → **URL Configuration**, add authorized redirect URLs:

* **Site URL**: `http://localhost:3000`
* **Additional Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>.vercel.app/auth/callback`

---

## Step 5 — Apply Database Schema & Migrations

For detailed Row Level Security rules, refer to [`SUPABASE_RLS_POLICY.md`](SUPABASE_RLS_POLICY.md).

Apply database schema to your Supabase PostgreSQL instance:

### Option A: Via Drizzle Kit (Recommended)
Ensure `DATABASE_URL` is set in `.env.local`, then push schema directly:
```bash
pnpm --filter web db:push
```

### Option B: Via Supabase SQL Editor
Copy and execute SQL scripts in numerical order from [`supabase/migrations/`](../../supabase/migrations):
1. `0001_initial_schema.sql`
2. `0002_create_profile_trigger.sql`
3. `0003_job_metadata.sql`
4. `0004_lock_server_managed_tables.sql`
5. `0005_selected_format_audio_flag.sql`

To verify database tables were created successfully, run in Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

---

## Step 6 — Optional Storage Bucket

Local temporary output (`local_temp`) is the default behavior. Supabase Storage is optional.

If enabling cloud storage mode, create a private bucket in Supabase Dashboard:
* **Bucket Name**: `media-downloads`
* **Access**: Private (Row Level Security enabled)

Object path pattern:
```text
{user_id}/{job_id}/output.mp4
{user_id}/{job_id}/output.mp3
```

---

## Step 7 — Configure Vercel Deployment

1. Import repository to Vercel
2. Configure Root Directory: `apps/web`
3. Set Environment Variables in Vercel Dashboard:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_FASTAPI_BASE_URL=https://your-backend-api-url.com
   ```
4. Deploy application

For detailed Vercel hosting instructions, see [`VERCEL_SETUP.md`](VERCEL_SETUP.md).

---

## Step 8 — Run Local Development

1. **Install dependencies across monorepo**:
   ```bash
   pnpm install
   pnpm setup:py
   ```

2. **Start Development Servers (3 Terminals at root)**:
   * **Terminal 1 (Web Frontend)**: `pnpm dev:web`
   * **Terminal 2 (FastAPI Backend)**: `pnpm dev:api`
   * **Terminal 3 (Media Worker)**: `pnpm dev:worker`

---

## Step 9 — Environment Validation

Run the environment validation script at any time to verify variable existence without revealing secret values:

```bash
pnpm check-env
```

Expected output:
```text
Environment Check
-----------------
NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
NEXT_PUBLIC_FASTAPI_BASE_URL: OK
SUPABASE_URL: OK
SUPABASE_SERVICE_ROLE_KEY: OK
DATABASE_URL: OK
WORKER_SECRET: OK
-----------------
No secret values were printed.
```

# User Setup Guide

First-time setup to run Media Loader for **real use** on your machine.

Follow these steps once. Add all secret values yourself in `.env.local` — never paste them into chat.

---

## Step 1 — Create Supabase Project

1. Go to Supabase dashboard
2. Create a new project
3. Choose a project name such as `media-loader`
4. Save your database password in a safe place
5. Wait until the project is ready

After this step, you will need:

```text
Project URL
Anon public key
Service role key
Database connection string
```

Do not paste these values into chat.

---

## Step 2 — Add Supabase Values Locally

Copy the example env file:

```bash
cp examples/.env.example .env.local
```

Then open `.env.local` on your own machine and fill:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

When done, tell the Agent:

```text
ใส่ Supabase env แล้วครับ
```

The Agent should run a safe validation check without showing the values.

---

## Step 3 — Configure Google OAuth for Supabase Auth

Detailed guide: `docs/GOOGLE_OAUTH_SETUP.md`.

1. Go to Google Cloud Console
2. Create or select a project
3. Configure OAuth consent screen
4. Create OAuth Client ID
5. Choose Web Application
6. Add authorized redirect URI from Supabase Auth settings
7. Copy Client ID and Client Secret
8. Paste them into Supabase Dashboard Auth Provider settings

Do not paste Client Secret into chat.

When done, tell the Agent:

```text
ตั้งค่า Google OAuth ใน Supabase แล้วครับ
```

---

## Step 4 — Configure Supabase Redirect URLs

In Supabase Auth URL configuration, add local and production URLs.

Local example:

```text
http://localhost:3000/auth/callback
```

Production example:

```text
https://your-vercel-domain.vercel.app/auth/callback
```

---

## Step 5 — Create Supabase Tables and RLS

Detailed RLS guide: `docs/SUPABASE_RLS_POLICY.md`.

Apply every migration in numeric order:

```text
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_create_profile_trigger.sql
supabase/migrations/0003_job_metadata.sql
supabase/migrations/0004_lock_server_managed_tables.sql
supabase/migrations/0005_selected_format_audio_flag.sql
```

`DATABASE_URL` must contain one PostgreSQL URI only, for example
`DATABASE_URL=postgresql://...`; do not paste the variable name inside its own
value. Percent-encode reserved characters in the database password.

You can apply them through:

- Supabase SQL editor
- Supabase CLI
- migration workflow

After applying, tell the Agent:

```text
รัน migrations ทั้งหมดแล้วครับ
```

The Agent should validate table access safely.

---

## Step 6 — Optional Storage Bucket

Local temporary output is the default behavior. You do not need Supabase Storage for the normal local workflow.

If you later enable cloud storage mode, create a private bucket:

```text
media-downloads
```

Recommended path pattern:

```text
{user_id}/{job_id}/output.mp4
{user_id}/{job_id}/output.mp3
```

After creating the optional bucket, tell the Agent:

```text
สร้าง Storage bucket แล้วครับ
```

---

## Step 7 — Configure Vercel

1. Create Vercel project
2. Import repository
3. Set root/project directory for `apps/web` if needed
4. Add environment variables in Vercel dashboard
5. Deploy

Vercel env values should include:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

Do not add server-only worker secrets to frontend unless specifically needed server-side and safe.

---

## Step 8 — Run Locally

Recommended Docker backend:

```bash
docker compose up --build api
docker compose --profile worker up --build worker
```

Frontend:

```bash
cd apps/web
pnpm dev
```

The frontend calls `NEXT_PUBLIC_FASTAPI_BASE_URL`, defaulting to:

```text
http://localhost:8000
```

### Download behavior

The normal local flow is:

```text
Paste URL (auto-analyze) → choose quality → Download (confirms rights)
```

Clicking **Download** starts the Docker worker without opening a file picker first. When processing finishes, the browser download starts automatically. If the browser setting to ask where each file should be saved is enabled, the save-location dialog opens at that point; otherwise the file goes to the browser's default Downloads folder.

The compact queue appears only while a job is active. History contains completed downloads and provides **Download again** and **Clear history** actions. **Download again** returns to the analyzer with the original URL and lets you choose a new video or audio quality before starting. Media files are still temporary server output; history stores job metadata, not a permanent media copy.

---

### Interface layout

On desktop, the signed-in app uses a persistent sidebar for **New load** and **History**. Account settings open by clicking the profile at the bottom of the sidebar. On phones and tablets, New load and History move to the bottom navigation while the profile avatar opens Account. Queue is contextual rather than a separate destination: it appears beside or below the analyzer only while a job is active.

The interface supports light and dark themes, Thai and English, keyboard focus indicators, reduced-motion preferences, and responsive layouts down to a 320px viewport.

---

## Step 9 — Safe Check Message

After adding keys, say:

```text
ใส่ key แล้วครับ รันเช็คได้เลย
```

The Agent should reply with status only:

```text
NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
SUPABASE_SERVICE_ROLE_KEY: OK
Database connection: OK
No secret values were printed.
```

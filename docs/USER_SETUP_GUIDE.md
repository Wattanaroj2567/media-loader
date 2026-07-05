# User Setup Guide

This guide is for the human user.

The Agent should guide you step by step, but you should add all secret values yourself.

Do not paste secret keys into chat.

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

The Agent should provide SQL files:

```text
supabase/schema.sql
supabase/rls_policies.sql
```

You can apply them through:

- Supabase SQL editor
- Supabase CLI
- migration workflow

After applying, tell the Agent:

```text
รัน schema กับ RLS แล้วครับ
```

The Agent should validate table access safely.

---

## Step 6 — Create Storage Bucket

Create a private bucket:

```text
media-downloads
```

Recommended path pattern:

```text
{user_id}/{job_id}/output.mp4
{user_id}/{job_id}/output.mp3
```

After creating the bucket, tell the Agent:

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

Frontend:

```bash
cd apps/web
pnpm dev
```

API:

```bash
cd apps/api
uvicorn app.main:app --reload
```

Worker:

```bash
cd apps/worker
python -m worker.main
```

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

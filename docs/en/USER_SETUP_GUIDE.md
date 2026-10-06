# User Setup Guide

> **Language:** **English** · [ภาษาไทย](../th/USER_SETUP_GUIDE.md)

This guide covers first-time setup for local development and deployment. Enter
credentials directly in your local environment or provider dashboard; never
share them in chat or commit them to Git.

---

## 1. Create a Supabase Project

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and create a
   project.
2. Save the database password securely.
3. From Project Settings, have these values ready for local setup:

   ```text
   Project URL
   Anon public key
   Service role key
   Database connection string (for Drizzle Kit commands)
   ```

The service-role key and database connection string are private credentials.
Keep them out of frontend variables, chat, and Git.

---

## 2. Configure Local Environment

1. Copy the example file to the local environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Enter the values locally. Do not paste real values into chat or documentation.
   The main Supabase and database entries are:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=your-postgresql-connection-string
   ```

3. Run the presence check; it prints statuses and does not need to print values:

   ```bash
   pnpm check-env
   ```

`DATABASE_URL` is needed when running Drizzle Kit database commands. See
[Environment Variables](ENVIRONMENT_VARIABLES.md) for the full current list.

---

## 3. Configure Google OAuth for Supabase Auth

Follow [Google OAuth Setup](GOOGLE_OAUTH_SETUP.md) to create a Google OAuth
client and configure the Supabase Google provider. Enter the Google Client ID
and Client Secret in Supabase Dashboard → **Authentication** → **Providers** →
**Google**. Do not put the Client Secret in frontend configuration.

---

## 4. Configure Supabase Redirect URLs

In Supabase Dashboard → **Authentication** → **URL Configuration**:

- Set **Site URL** to the production frontend origin when deploying, such as
  `https://your-domain.vercel.app`.
- Add each allowed application callback URL to **Redirect URLs**:
  - Local development: `http://localhost:3000/auth/callback`
  - Production: `https://your-domain.vercel.app/auth/callback`

For local-only development, `http://localhost:3000` may be used as Site URL.
Use the production origin as Site URL for a deployed app.

---

## 5. Create the Database Schema and Policies

`apps/web/lib/db/schema.ts` is the source of truth for application tables and
columns. With `DATABASE_URL` configured locally, run:

```bash
pnpm --filter web db:push
```

Then run the project-specific Supabase policy and trigger scripts in the
Supabase SQL Editor:

1. [`supabase/profile_trigger.sql`](../../supabase/profile_trigger.sql)
2. [`supabase/rls_policies.sql`](../../supabase/rls_policies.sql)

These SQL files are for Supabase functions, triggers, and RLS policies. Define
application table or column changes in Drizzle first; do not use historical
files under `supabase/migrations/` as the source of truth.

For details, see [Database Schema](DATABASE_SCHEMA.md) and
[Supabase RLS Policy](SUPABASE_RLS_POLICY.md).

---

## 6. Media File Storage

The current application stores temporary output in a local/shared filesystem
volume (`local_temp`). A complete Supabase cloud-output flow is not currently
implemented. Creating a Storage bucket or setting a bucket name alone will not
enable cloud storage.

For Docker deployment, ensure API and worker share the same output volume and
use the same `TEMP_DIR`. Review the [Environment Variables](ENVIRONMENT_VARIABLES.md)
and [Architecture](ARCHITECTURE.md) guides.

---

## 7. Deploy the Frontend to Vercel

1. Import the repository into Vercel.
2. Keep **Root Directory** at the repository root. The root `vercel.json`
   configures the pnpm monorepo build.
3. Set the public frontend variables in Vercel:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
   NEXT_PUBLIC_FASTAPI_BASE_URL=https://your-backend-api-domain.com
   ```

4. Deploy. Deploy the API and worker separately, and set API CORS to allow the
   Vercel production origin.

Use a reachable HTTPS backend URL for production; `localhost` only works for
local development. Follow [Vercel Setup](VERCEL_SETUP.md) for deployment
details. Never set the service-role key in the Vercel frontend project.

---

## 8. Run Local Development

From the repository root, install dependencies and start the services:

```bash
pnpm install
pnpm setup:py
pnpm dev
```

This starts the web app, FastAPI with reload, and the worker. The web app is at
`http://localhost:3000`; the API is at `http://localhost:8000`.

To build and run only the Next.js production server locally for Lighthouse
checks, ensure port `3000` is available and run `pnpm production`. It does not
start Docker, the API, or the worker. Press `Ctrl+C` to stop it.

---

## 9. Check Environment Configuration

Run this from the repository root when you need to check required environment
variable presence:

```bash
pnpm check-env
```

The checker reports statuses only. Its success does not inspect the compiled
frontend bundle; do not use it as proof that secret values cannot be exposed.

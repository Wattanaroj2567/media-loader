# Supabase Database Support Files

Application tables and columns are owned by Drizzle in
`apps/web/lib/db/schema.ts`. This directory contains only the Supabase-specific
Row Level Security policies, PostgreSQL functions, and triggers needed around
that schema.

---

## Fresh Setup

From the repository root, create or update application tables through Drizzle:

```bash
pnpm --filter web db:push
```

Then run these files in the Supabase SQL Editor, in order:

1. `profile_trigger.sql` — creates the Auth-to-profile function and trigger
2. `rls_policies.sql` — enables RLS and installs user-scoped policies

Files under `migrations/` and `schema.sql` are retained as historical bootstrap
artifacts. Do not add new application table or column changes there.

## Verify the Setup

### 1. Check if tables exist

Run this query inside a new SQL Editor tab to view public tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Expected output:

- `profiles`
- `download_jobs`
- `policy_logs`

---

### 2. Confirm RLS Policies are Active

Run this query to verify that security rules are enabled for every table:

```sql
SELECT tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

Expected output:

- `download_jobs` and `policy_logs` expose user-scoped `SELECT` policies
  only. Their mutations run through FastAPI/worker.
- `profiles` keeps user-scoped policies for the operations their
  browser-facing profile flows require.

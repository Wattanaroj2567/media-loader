# Supabase RLS Policy Guide

> **Language:** **English** · [ภาษาไทย](../th/SUPABASE_RLS_POLICY.md)

This guide describes the current Supabase Row Level Security model.

Database ownership is split deliberately:

```text
apps/web/lib/db/schema.ts    → application tables, columns, constraints, and indexes
supabase/profile_trigger.sql → Auth profile function and trigger
supabase/rls_policies.sql    → Row Level Security policies
```

The SQL files retained under `supabase/migrations/` are historical bootstrap
artifacts. Do not extend them for new application table or column changes;
make those changes in the Drizzle schema.

## Main rule

Signed-in users may read only rows that belong to their account. Policies use
`auth.uid() = user_id` for user-owned rows or `auth.uid() = id` for profiles.

Guest jobs have no Supabase user ID. The API scopes those jobs by
`guest_session_id`; browser clients do not query guest jobs directly through
Supabase.

The current application schema has three public tables: `profiles`,
`download_jobs`, and `policy_logs`. Analyzed formats are API response data.
The selected format and related metadata are stored on `download_jobs`; there
is no separate `media_formats` table.

## Tables that require RLS

```text
profiles
download_jobs
policy_logs
```

Enable RLS on each table.

## Policy patterns

For user-readable rows with `user_id`:

```sql
using (auth.uid() = user_id)
```

For `profiles`, where `id` references `auth.users(id)`:

```sql
using (auth.uid() = id)
with check (auth.uid() = id)
```

Browser clients may read only their own `download_jobs` and `policy_logs` rows.
They have no direct insert, update, or delete policies for these server-managed
tables. FastAPI and the worker perform trusted writes after policy and ownership
checks.

## Service-role key

The Supabase service-role key can bypass RLS. Therefore:

- Keep it only in trusted API or worker environments.
- Never expose it to browser code or variables prefixed with `NEXT_PUBLIC_`.
- Never print it in logs.

## Storage

Local temporary output is the default. FastAPI checks job ownership before
streaming a local file.

If a future deployment enables Supabase Storage, keep the bucket private. A
suggested object path is:

```text
{user_id}/{job_id}/{filename}
```

Use short-lived signed URLs for cloud files and do not log or share those URLs.

## Review checklist

- [ ] RLS is enabled on every user-owned table.
- [ ] Select policies restrict rows to the signed-in owner.
- [ ] Browser clients cannot mutate server-managed queue or policy-log rows.
- [ ] Profile mutations remain scoped to the signed-in user.
- [ ] Service-role keys exist only on trusted server-side services.
- [ ] Optional Storage buckets are private.
- [ ] Signed URLs are not logged.
- [ ] File streaming verifies the owner or guest session before delivery.

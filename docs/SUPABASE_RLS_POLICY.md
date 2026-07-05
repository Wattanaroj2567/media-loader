# Supabase RLS Policy Guide

This guide explains how Row Level Security should be used in Media Loader.

The actual starter SQL files are:

```text
supabase/schema.sql
supabase/rls_policies.sql
```

---

## Main Rule

All user-owned data must be protected by `user_id` or `id = auth.uid()`.

Users should only access their own:

- profile
- download jobs
- media formats
- policy logs
- settings
- storage files

---

## Tables That Require RLS

```text
profiles
download_jobs
media_formats
policy_logs
user_settings
```

RLS must be enabled on every table above.

---

## Policy Pattern

For tables with `user_id`:

```sql
using (auth.uid() = user_id)
with check (auth.uid() = user_id)
```

For `profiles` where `id` references `auth.users(id)`:

```sql
using (auth.uid() = id)
with check (auth.uid() = id)
```

---

## Service Role Rule

The Supabase service role key can bypass RLS.

Therefore:

- It must only exist in FastAPI or Worker environments
- It must never be exposed to the browser
- It must never be placed in `NEXT_PUBLIC_*`
- It must never be printed in logs

---

## Storage Rule

The storage bucket should be private.

Recommended bucket:

```text
media-downloads
```

Recommended path pattern:

```text
{user_id}/{job_id}/{filename}
```

File access should use signed URLs.

---

## Agent Review Checklist

- [ ] RLS is enabled on all user-owned tables
- [ ] Select policies are user-scoped
- [ ] Insert policies prevent writing rows for another user
- [ ] Update policies are user-scoped
- [ ] Delete policies are user-scoped where needed
- [ ] Service role key is server/worker-only
- [ ] Storage bucket is private
- [ ] Signed URLs are not logged

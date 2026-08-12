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
- optional storage files if cloud mode is enabled

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

For user-readable tables with `user_id`:

```sql
using (auth.uid() = user_id)
```

For `profiles` where `id` references `auth.users(id)`:

```sql
using (auth.uid() = id)
with check (auth.uid() = id)
```

`download_jobs`, `media_formats`, and `policy_logs` are server-managed. Browser
clients may read only their own rows and have no direct `INSERT`, `UPDATE`, or
`DELETE` policies. FastAPI and the worker mutate these tables with the
server-only service role after authentication and policy checks. This prevents
direct Supabase inserts from bypassing the required queue flow.

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

Local temporary output is the default path, so normal file delivery is protected by FastAPI session validation and user-scoped job lookups.

If optional cloud storage mode is enabled later, the storage bucket should be private.

Recommended bucket:

```text
media-downloads
```

Recommended path pattern:

```text
{user_id}/{job_id}/{filename}
```

Cloud file access should use short-lived signed URLs and must not be logged. Default local file access uses authenticated FastAPI streaming instead.

---

## Agent Review Checklist

- [ ] RLS is enabled on all user-owned tables
- [ ] Select policies are user-scoped
- [ ] Server-managed tables expose no browser mutation policies
- [ ] Profile/settings mutations remain user-scoped where needed
- [ ] Service role key is server/worker-only
- [ ] Optional Storage bucket is private when enabled
- [ ] Signed URLs are not logged if optional cloud mode is enabled
- [ ] Default local file endpoint verifies the owner before streaming

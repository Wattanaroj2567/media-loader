# Supabase Setup

## Supabase Responsibilities

Supabase handles:

- Google Auth
- PostgreSQL
- Storage
- Row Level Security
- Optional Realtime job status updates

---

## Required Tables

- `profiles`
- `download_jobs`
- `media_formats`
- `policy_logs`
- `user_settings`

Use `supabase/schema.sql` as the starting SQL.

---

## Required RLS

Enable RLS for all user-owned tables.

Use `supabase/rls_policies.sql` as the starting policy file.

---

## Storage Bucket

Create a private bucket:

```text
media-downloads
```

Files should be stored under:

```text
{user_id}/{job_id}/{filename}
```

Access should happen through signed URLs.

---

## Auth Provider

Enable Google provider in Supabase Auth.

The user should add Google OAuth Client ID and Client Secret directly inside Supabase dashboard.

The Agent should not see these values.

---

## Local Redirect URL

```text
http://localhost:3000/auth/callback
```

## Production Redirect URL

```text
https://your-vercel-domain.vercel.app/auth/callback
```

---

## Realtime Option

Realtime can be used for `download_jobs` progress updates.

MVP can use polling first if simpler.

Recommended MVP:

```text
Start with polling every 2-5 seconds.
Add Realtime later.
```

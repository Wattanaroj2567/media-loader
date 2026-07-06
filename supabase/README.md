# Supabase Database Migration Guide

This directory contains the initial schema structures and Row Level Security (RLS) policies for the Media Loader workspace application.

---

## SQL Migration Details

Apply every file under `supabase/migrations/` in numeric order:

1. `0001_initial_schema.sql` — tables, indexes, RLS
2. `0002_create_profile_trigger.sql` — Google Auth profile bootstrap
3. `0003_job_metadata.sql` — analyzer/history metadata
4. `0004_lock_server_managed_tables.sql` — blocks direct browser queue mutations
5. `0005_selected_format_audio_flag.sql` — keeps video/audio merge selection faithful

---

## How to Apply SQL Migrations

Follow these steps inside your Supabase project dashboard:

1. Navigate to the **Supabase Dashboard** -> select your project.
2. Click **SQL Editor** from the left navigation sidebar.
3. Click **New query** (or **New Blank Query**).
4. Open each migration in numeric order and copy it into the SQL Editor.
5. Click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`) before moving to the next file.
6. Confirm that each migration returns `Success. No rows returned` or similar.

---

## Verifying the Table and RLS Setup

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
- `media_formats`
- `policy_logs`
- `user_settings`

---

### 2. Confirm RLS Policies are Active

Run this query to verify that security rules are enabled for every table:

```sql
SELECT tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

Expected output:

- `download_jobs`, `media_formats`, and `policy_logs` expose user-scoped
  `SELECT` policies only. Their mutations run through FastAPI/worker.
- `profiles` and `user_settings` keep user-scoped policies for the operations
  their browser-facing settings flows require.

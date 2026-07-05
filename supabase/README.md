# Supabase Database Migration Guide

This directory contains the initial schema structures and Row Level Security (RLS) policies for the Media Loader workspace application.

---

## SQL Migration Details

- **File:** [`supabase/migrations/0001_initial_schema.sql`](migrations/0001_initial_schema.sql)
- Contains:
  - 5 public tables (`profiles`, `download_jobs`, `media_formats`, `policy_logs`, `user_settings`)
  - Primary database indexes for querying
  - Authentication checks to verify users only read/write their own records (`auth.uid() = user_id`)

---

## How to Apply SQL Migrations

Follow these steps inside your Supabase project dashboard:

1. Navigate to the **Supabase Dashboard** -> select your project.
2. Click **SQL Editor** from the left navigation sidebar.
3. Click **New query** (or **New Blank Query**).
4. Copy the entire contents of [`supabase/migrations/0001_initial_schema.sql`](migrations/0001_initial_schema.sql).
5. Paste it directly into the SQL Editor input area.
6. Click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`).
7. Confirm that the logs return `Success. No rows returned` or similar success indicators.

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

- You should see user-scoped checks matching `(auth.uid() = user_id)` (or `id` for profiles) for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` commands.

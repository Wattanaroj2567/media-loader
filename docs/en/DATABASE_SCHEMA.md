# Database Schema

> **Language:** **English** · [ภาษาไทย](../th/DATABASE_SCHEMA.md)

Supabase PostgreSQL is the main database.

All user-owned tables must use `user_id uuid references auth.users(id)` and Row Level Security.

---

## `profiles`

Stores public user profile data copied from Supabase Auth metadata.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, references auth.users(id) |
| email | text | User email |
| full_name | text | Display name |
| avatar_url | text | Profile image |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |

---

## `download_jobs`

Stores each media job.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner (nullable for anonymous guest downloads) |
| guest_session_id | text | Ephemeral guest session ID for progress tracking without login |
| original_url | text | Submitted URL |
| platform | text | direct, youtube, tiktok, etc. |
| title | text | Media title |
| uploader | text | Creator/uploader name returned by analysis |
| source_domain | text | Source domain returned by analysis |
| thumbnail_url | text | Optional thumbnail |
| duration_seconds | integer | Media duration in seconds |
| media_type | text | video, audio, unknown |
| selected_format_id | text | Selected extractor format |
| selected_quality | text | Human readable quality |
| selected_has_audio | boolean | Selected video format already contains audio |
| output_format | text | mp4, mp3, gif, original |
| status | text | Job status |
| progress | integer | 0-100 |
| error_message | text | Safe error message |
| storage_bucket | text | Optional Supabase bucket for future/cloud mode |
| storage_path | text | Local temp output path by default; optional Storage path in cloud mode |
| file_size | bigint | Completed file size (never overwritten by estimates) |
| total_bytes_estimate | bigint | Live source size estimate during DOWNLOADING |
| rights_confirmed | boolean | User confirmation |
| locked_at | timestamptz | Worker lock timestamp |
| locked_by | text | Queue target `pool:<environment>` while queued; worker identifier while processing |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |
| completed_at | timestamptz | Completed timestamp |
| download_speed | bigint | Average download speed (Bytes/sec) |

---

## `policy_logs`

Stores policy decisions for audit and debugging.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner (nullable for guest downloads) |
| url | text | Original URL |
| platform | text | Detected platform |
| decision | text | allowed, blocked, needs_confirmation |
| reason | text | Human readable reason |
| created_at | timestamptz | Created timestamp |

---

## Dual-Layer Database Strategy

Always follow this dual-layer strategy for database operations:

### 1. Table Schemas & Column Migrations (Drizzle ORM)

- `apps/web/lib/db/schema.ts` is the **single source of truth** for all database tables, columns, constraints, and indexes.
- When adding a new table or altering columns, always define or modify it in `apps/web/lib/db/schema.ts` first.
- Do not default to raw SQL (`CREATE TABLE`, `ALTER TABLE`) to create or alter application tables.
- Use `pnpm --filter web db:push` to apply schema updates in development, or `pnpm --filter web db:generate` to produce migrations.
- Export TypeScript types from `schema.ts` to ensure type safety across the web app.

### 2. Supabase-Specific Policies & Triggers (Raw SQL in `supabase/`)

- Use raw SQL files under `supabase/migrations/` or `supabase/rls_policies.sql` only for:
  - Row Level Security (RLS) policies (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`, `CREATE POLICY ...`).
  - PostgreSQL database triggers (e.g. creating user profiles upon Google Auth signup in `auth.users`).
  - PostgreSQL functions, stored procedures, or Supabase extensions.

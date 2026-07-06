-- Initial Schema & RLS Policies combined migration
-- Source: supabase/schema.sql and supabase/rls_policies.sql
-- Consolidates all tables, trigger functions, security locks, and updates.

create extension if not exists "pgcrypto";

-- ==========================================
-- 1. Create Tables
-- ==========================================

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Download jobs
create table if not exists public.download_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_url text not null,
  platform text not null default 'unknown',
  title text,
  uploader text,
  source_domain text,
  thumbnail_url text,
  duration_seconds integer,
  media_type text not null default 'unknown',
  selected_format_id text,
  selected_quality text,
  selected_has_audio boolean not null default false,
  output_format text,
  status text not null default 'PENDING',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  error_message text,
  storage_bucket text,
  storage_path text,
  file_size bigint,
  rights_confirmed boolean not null default false,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  download_speed bigint
);

-- Media formats
create table if not exists public.media_formats (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.download_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  format_id text not null,
  extension text,
  resolution text,
  fps integer,
  video_codec text,
  audio_codec text,
  bitrate integer,
  filesize bigint,
  is_video boolean not null default false,
  is_audio boolean not null default false,
  created_at timestamptz not null default now()
);

-- Policy logs
create table if not exists public.policy_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  url text not null,
  platform text not null default 'unknown',
  decision text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ==========================================
-- 2. Indexes
-- ==========================================
create index if not exists idx_download_jobs_user_id_created_at on public.download_jobs(user_id, created_at desc);
create index if not exists idx_download_jobs_status on public.download_jobs(status);
create index if not exists idx_media_formats_user_id on public.media_formats(user_id);
create index if not exists idx_policy_logs_user_id_created_at on public.policy_logs(user_id, created_at desc);

-- ==========================================
-- 3. Row Level Security Policies
-- ==========================================

alter table public.profiles enable row level security;
alter table public.download_jobs enable row level security;
alter table public.media_formats enable row level security;
alter table public.policy_logs enable row level security;

-- Profiles Policies
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- Download Jobs Policies (Read Only for Users, Mutated via Server-side/Service Role)
drop policy if exists "Users can read own download jobs" on public.download_jobs;
create policy "Users can read own download jobs"
on public.download_jobs
for select
to authenticated
using (auth.uid() = user_id);

-- Media Formats Policies (Read Only for Users, Mutated via Server-side/Service Role)
drop policy if exists "Users can read own media formats" on public.media_formats;
create policy "Users can read own media formats"
on public.media_formats
for select
to authenticated
using (auth.uid() = user_id);

-- Policy Logs Policies (Read Only for Users, Mutated via Server-side/Service Role)
drop policy if exists "Users can read own policy logs" on public.policy_logs;
create policy "Users can read own policy logs"
on public.policy_logs
for select
to authenticated
using (auth.uid() = user_id);

-- ==========================================
-- 4. User Registration Profile Trigger
-- ==========================================

-- Function to handle new user registration and insert into public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run handle_new_user on sign up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

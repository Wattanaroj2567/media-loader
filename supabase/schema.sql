-- Media Loader Supabase Schema
-- Apply in Supabase SQL editor or through migrations.

create extension if not exists "pgcrypto";

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
  thumbnail_url text,
  media_type text not null default 'unknown',
  selected_format_id text,
  selected_quality text,
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
  completed_at timestamptz
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

-- User settings
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_video_quality text default '720p',
  default_audio_quality text default '192kbps',
  auto_cleanup_days integer default 7,
  max_file_size_mb integer default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_download_jobs_user_id_created_at on public.download_jobs(user_id, created_at desc);
create index if not exists idx_download_jobs_status on public.download_jobs(status);
create index if not exists idx_media_formats_user_id on public.media_formats(user_id);
create index if not exists idx_policy_logs_user_id_created_at on public.policy_logs(user_id, created_at desc);

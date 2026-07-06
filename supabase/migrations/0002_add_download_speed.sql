-- Add download_speed column to download_jobs table
alter table public.download_jobs
  add column if not exists download_speed bigint;

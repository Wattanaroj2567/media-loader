-- Separate the live download size estimate from the completed file size
alter table public.download_jobs
  add column if not exists total_bytes_estimate bigint;

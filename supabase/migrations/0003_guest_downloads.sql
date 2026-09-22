-- Migration: Support guest/anonymous downloads
-- Makes user_id nullable on download_jobs and introduces guest_session_id for ephemeral client tracking.

alter table public.download_jobs alter column user_id drop not null;

alter table public.download_jobs add column if not exists guest_session_id text;

create index if not exists idx_download_jobs_guest_session
  on public.download_jobs(guest_session_id)
  where guest_session_id is not null;

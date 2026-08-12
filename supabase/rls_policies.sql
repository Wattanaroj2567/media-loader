-- Media Loader RLS Policies

alter table public.profiles enable row level security;
alter table public.download_jobs enable row level security;
alter table public.policy_logs enable row level security;

-- Profiles
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- Download jobs
drop policy if exists "Users can read own download jobs" on public.download_jobs;
create policy "Users can read own download jobs"
on public.download_jobs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own download jobs" on public.download_jobs;
drop policy if exists "Users can update own download jobs" on public.download_jobs;
drop policy if exists "Users can delete own download jobs" on public.download_jobs;

-- Policy logs
drop policy if exists "Users can read own policy logs" on public.policy_logs;
create policy "Users can read own policy logs"
on public.policy_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own policy logs" on public.policy_logs;



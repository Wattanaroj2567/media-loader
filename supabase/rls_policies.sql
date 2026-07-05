-- Media Loader RLS Policies

alter table public.profiles enable row level security;
alter table public.download_jobs enable row level security;
alter table public.media_formats enable row level security;
alter table public.policy_logs enable row level security;
alter table public.user_settings enable row level security;

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
create policy "Users can read own download jobs"
on public.download_jobs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own download jobs"
on public.download_jobs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own download jobs"
on public.download_jobs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own download jobs"
on public.download_jobs
for delete
to authenticated
using (auth.uid() = user_id);

-- Media formats
create policy "Users can read own media formats"
on public.media_formats
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own media formats"
on public.media_formats
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete own media formats"
on public.media_formats
for delete
to authenticated
using (auth.uid() = user_id);

-- Policy logs
create policy "Users can read own policy logs"
on public.policy_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own policy logs"
on public.policy_logs
for insert
to authenticated
with check (auth.uid() = user_id);

-- User settings
create policy "Users can read own settings"
on public.user_settings
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own settings"
on public.user_settings
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own settings"
on public.user_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

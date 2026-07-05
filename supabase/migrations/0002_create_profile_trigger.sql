-- Function to handle new user registration and insert into public.profiles & public.user_settings
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
  
  -- Also initialize default settings for the user
  insert into public.user_settings (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run handle_new_user on sign up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

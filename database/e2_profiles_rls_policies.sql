-- RLS policies for Entrega 2 profiles.
-- Run after database/initial_schema.sql and database/e2_schema.sql.

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
);

drop policy if exists "Users can update own profile without changing role" on public.profiles;
create policy "Users can update own profile without changing role"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
  and role = public.current_profile_role()
);

drop policy if exists "Center admins can read profiles" on public.profiles;
create policy "Center admins can read profiles"
on public.profiles
for select
to authenticated
using (
  public.current_profile_role() = 'center_admin'
);

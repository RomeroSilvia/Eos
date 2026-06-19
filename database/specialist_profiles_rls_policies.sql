-- RLS policies for Entrega 2 Module 3 specialist profiles.
-- Run after database/e2_schema.sql.
-- This keeps RLS enabled and does not delete data.

alter table public.specialist_profiles enable row level security;

drop policy if exists "Specialists can insert own specialist profile" on public.specialist_profiles;
create policy "Specialists can insert own specialist profile"
on public.specialist_profiles
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists "Specialists can read own specialist profile" on public.specialist_profiles;
create policy "Specialists can read own specialist profile"
on public.specialist_profiles
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists "Specialists can update own pending or rejected specialist profile" on public.specialist_profiles;
create policy "Specialists can update own pending or rejected specialist profile"
on public.specialist_profiles
for update
to authenticated
using (
  auth.uid() = user_id
  and license_status in ('pending', 'rejected')
)
with check (
  auth.uid() = user_id
  and license_status = 'pending'
);

drop policy if exists "Center admins can read specialist profiles" on public.specialist_profiles;
create policy "Center admins can read specialist profiles"
on public.specialist_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'center_admin'
  )
);

drop policy if exists "Center admins can update specialist status" on public.specialist_profiles;
create policy "Center admins can update specialist status"
on public.specialist_profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'center_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'center_admin'
  )
);

-- RLS policies for Entrega 3 Module 3 centers / center_admins.
-- Run after supabase/migrations/20260619000100_initial_schema.sql.
-- This keeps RLS enabled and does not delete data.
--
-- Design intent (see docs/e3-supabase-security.md):
-- - All writes to `centers`/`center_admins` go through the backend using the
--   service_role key, which is expected to bypass RLS entirely.
-- - The policies below for `to service_role` are a defensive safety net in
--   case the Postgres `service_role` role in this project ever loses its
--   BYPASSRLS attribute (it should not need to rely on these policies at
--   all under normal Supabase provisioning). To confirm whether that is the
--   actual problem, run in the Supabase SQL editor:
--     select rolname, rolbypassrls from pg_roles where rolname = 'service_role';
-- - Read policies for `authenticated` mirror what the backend already
--   enforces in code (center_admin can read centers/rows it is assigned to).

alter table public.centers enable row level security;
alter table public.center_admins enable row level security;

-- centers -------------------------------------------------------------------

drop policy if exists "Service role has full access to centers" on public.centers;
create policy "Service role has full access to centers"
on public.centers
for all
to service_role
using (true)
with check (true);

drop policy if exists "Center admins can read their centers" on public.centers;
create policy "Center admins can read their centers"
on public.centers
for select
to authenticated
using (
  exists (
    select 1
    from public.center_admins
    where center_admins.center_id = centers.id
      and center_admins.user_id = auth.uid()
      and center_admins.role = 'center_admin'
  )
);

-- center_admins ---------------------------------------------------------------

drop policy if exists "Service role has full access to center_admins" on public.center_admins;
create policy "Service role has full access to center_admins"
on public.center_admins
for all
to service_role
using (true)
with check (true);

drop policy if exists "Center admins can read own center_admins rows" on public.center_admins;
create policy "Center admins can read own center_admins rows"
on public.center_admins
for select
to authenticated
using (
  user_id = auth.uid()
);

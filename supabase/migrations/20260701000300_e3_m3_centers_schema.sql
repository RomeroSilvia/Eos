-- E3 M3: Centros esteticos y scope administrativo por centro.
-- Publica primero el contrato minimo que M5 necesita: centers + specialist_profiles.center_id.

create table if not exists public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.center_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  center_id uuid not null references public.centers(id) on delete cascade,
  role text not null default 'center_admin',
  created_at timestamptz not null default now(),
  unique (user_id, center_id)
);

alter table public.specialist_profiles
add column if not exists center_id uuid null references public.centers(id) on delete set null;

create index if not exists centers_is_active_idx
on public.centers(is_active);

create index if not exists center_admins_user_id_idx
on public.center_admins(user_id);

create index if not exists center_admins_center_id_idx
on public.center_admins(center_id);

create index if not exists specialist_profiles_center_id_idx
on public.specialist_profiles(center_id);

alter table public.centers enable row level security;
alter table public.center_admins enable row level security;

drop policy if exists "Center admins can read assigned centers" on public.centers;
create policy "Center admins can read assigned centers"
on public.centers
for select
to authenticated
using (
  exists (
    select 1
    from public.center_admins center_admin
    join public.profiles profile
      on profile.id = center_admin.user_id
    where center_admin.center_id = centers.id
      and center_admin.user_id = auth.uid()
      and center_admin.role = 'center_admin'
      and profile.role = 'center_admin'
  )
);

drop policy if exists "Center admins can read own center admin rows" on public.center_admins;
create policy "Center admins can read own center admin rows"
on public.center_admins
for select
to authenticated
using (
  user_id = auth.uid()
  and role = 'center_admin'
  and exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'center_admin'
  )
);

-- TODO: las politicas de escritura de centers/center_admins quedan para el backend M3
-- con service_role o para una decision futura de administracion de plataforma.

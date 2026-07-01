-- Eos Entrega 2 schema changes.
-- Incremental migration only. Do not replace or rerun database/initial_schema.sql with this file.

alter table public.profiles
add column if not exists role text not null default 'user'
check (role in ('user', 'specialist', 'center_admin'));

create table if not exists public.specialist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  specialty text not null check (specialty in ('dermatologo', 'cosmetologo')),
  license_number text not null,
  dni_photo_url text not null,
  title_photo_url text not null,
  license_status text not null default 'pending' check (license_status in ('pending', 'verified', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (license_number)
);

create index if not exists specialist_profiles_user_id_idx
on public.specialist_profiles(user_id);

create index if not exists specialist_profiles_license_number_idx
on public.specialist_profiles(license_number);

create index if not exists specialist_profiles_license_status_idx
on public.specialist_profiles(license_status);

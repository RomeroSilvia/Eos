-- Eos Entrega 2 schema needed before E2/M4 policies run locally.
-- Copied/adapted from database/e2_schema.sql, database/e5_client_specialist_chat_schema.sql
-- and database/e2_m4_assigned_routines.sql.

create extension if not exists "pgcrypto";

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

create table if not exists public.client_specialist_relations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  specialist_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (client_id <> specialist_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'client_specialist_relations_one_active_client_idx'
  ) then
    create unique index client_specialist_relations_one_active_client_idx
    on public.client_specialist_relations(client_id)
    where status = 'active';
  end if;
end $$;

create index if not exists client_specialist_relations_specialist_status_idx
on public.client_specialist_relations(specialist_id, status);

create index if not exists client_specialist_relations_client_status_created_idx
on public.client_specialist_relations(client_id, status, created_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  relation_id uuid not null references public.client_specialist_relations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(trim(content)) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_relation_created_idx
on public.chat_messages(relation_id, created_at desc);

create index if not exists chat_messages_unread_relation_sender_idx
on public.chat_messages(relation_id, sender_id)
where read_at is null;

alter table public.routines
add column if not exists assigned_by uuid references public.profiles(id) on delete set null;

create index if not exists routines_assigned_by_idx
on public.routines(assigned_by)
where assigned_by is not null;

create index if not exists routines_user_assigned_by_idx
on public.routines(user_id, assigned_by);

-- TODO: no existe definicion SQL de public.push_tokens en database/*.sql.
-- Agregarla en una migracion posterior copiando el contrato real cuando este documentado.

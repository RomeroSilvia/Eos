-- Eos initial Supabase/PostgreSQL schema proposal.
-- Base only: review before production and before enabling real auth flows.

create extension if not exists "pgcrypto";

-- User profile linked to a future Supabase Auth user id.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  skin_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Skin diagnosis profile created from the onboarding quiz.
create table if not exists public.skin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  age_range text,
  skin_type text,
  imperfections text,
  main_goal text,
  routine_steps text,
  created_at timestamptz not null default now()
);

-- Skincare routines owned by a user profile.
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  time_of_day text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ordered steps that belong to a routine.
create table if not exists public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  name text not null,
  description text,
  category text,
  step_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Products registered by a user profile.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  brand text,
  category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Join table between routine steps and products.
create table if not exists public.routine_step_products (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.routine_steps(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (step_id, product_id)
);

-- Daily routine completion log.
create table if not exists public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  log_date date not null,
  completed_at timestamptz,
  completion_percentage numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, routine_id, log_date)
);

-- Per-step completion log for a routine log.
create table if not exists public.routine_step_logs (
  id uuid primary key default gen_random_uuid(),
  routine_log_id uuid not null references public.routine_logs(id) on delete cascade,
  step_id uuid not null references public.routine_steps(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (routine_log_id, step_id)
);

-- TODO: Enable RLS policies before production.
-- alter table public.profiles enable row level security;
-- alter table public.skin_profiles enable row level security;
-- alter table public.routines enable row level security;
-- alter table public.routine_steps enable row level security;
-- alter table public.products enable row level security;
-- alter table public.routine_step_products enable row level security;
-- alter table public.routine_logs enable row level security;
-- alter table public.routine_step_logs enable row level security;

-- TODO: Add indexes once access patterns are confirmed.
-- create index if not exists routines_user_id_idx on public.routines(user_id);
-- create index if not exists skin_profiles_user_id_idx on public.skin_profiles(user_id);
-- create index if not exists routine_steps_routine_id_idx on public.routine_steps(routine_id);
-- create index if not exists products_user_id_idx on public.products(user_id);
-- create index if not exists routine_logs_user_id_log_date_idx on public.routine_logs(user_id, log_date);
-- create index if not exists routine_step_logs_routine_log_id_idx on public.routine_step_logs(routine_log_id);

-- TODO: Add updated_at triggers before production.
-- create or replace function public.set_updated_at()
-- returns trigger as $$
-- begin
--   new.updated_at = now();
--   return new;
-- end;
-- $$ language plpgsql;

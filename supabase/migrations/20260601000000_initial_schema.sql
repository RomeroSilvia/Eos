-- Eos initial Supabase/PostgreSQL schema.
-- Copied from database/initial_schema.sql so local migrations can rebuild from zero.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  skin_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.routine_step_products (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.routine_steps(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (step_id, product_id)
);

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

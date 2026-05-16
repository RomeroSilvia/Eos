create extension if not exists "pgcrypto";

create table if not exists public.skin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  age_range varchar,
  skin_type varchar,
  imperfections varchar,
  main_goal varchar,
  routine_steps varchar,
  created_at timestamp not null default now(),
  unique (user_id)
);

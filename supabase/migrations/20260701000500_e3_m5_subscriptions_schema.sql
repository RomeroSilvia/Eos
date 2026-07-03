-- E3 M5 - Subscription plans and subscriptions schema.
-- Informative module: does not enforce feature access in E3.

create extension if not exists pgcrypto;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  level text not null,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user', 'center')),
  owner_id uuid not null,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'pending', 'canceled', 'expired', 'past_due')),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_plans_is_active_idx
on public.subscription_plans(is_active);

create index if not exists subscriptions_owner_idx
on public.subscriptions(owner_type, owner_id);

create index if not exists subscriptions_status_idx
on public.subscriptions(status);

create unique index if not exists subscriptions_one_active_per_owner_idx
on public.subscriptions(owner_type, owner_id)
where status = 'active';

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;

-- deny-all by default. Explicit policies below.

drop policy if exists "Authenticated users can read subscription plans" on public.subscription_plans;
create policy "Authenticated users can read subscription plans"
on public.subscription_plans
for select
to authenticated
using (true);

drop policy if exists "Only center admin can manage subscription plans" on public.subscription_plans;
create policy "Only center admin can manage subscription plans"
on public.subscription_plans
for all
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

drop policy if exists "Users can read their own subscriptions" on public.subscriptions;
create policy "Users can read their own subscriptions"
on public.subscriptions
for select
to authenticated
using (
  (owner_type = 'user' and owner_id = auth.uid())
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'center_admin'
  )
);

drop policy if exists "Center admin can manage subscriptions" on public.subscriptions;
create policy "Center admin can manage subscriptions"
on public.subscriptions
for all
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

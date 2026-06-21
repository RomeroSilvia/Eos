-- Modulo 5: specialist linking and chat schema.
-- Idempotent migration. Keeps existing data and only adds missing structures.

create extension if not exists pgcrypto;

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
    if exists (
      select 1
      from public.client_specialist_relations
      where status = 'active'
      group by client_id
      having count(*) > 1
    ) then
      raise notice 'Skipping client_specialist_relations_one_active_client_idx because duplicate active client relations exist.';
    else
      create unique index client_specialist_relations_one_active_client_idx
      on public.client_specialist_relations(client_id)
      where status = 'active';
    end if;
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

alter table public.client_specialist_relations enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Participants can read own active specialist relations" on public.client_specialist_relations;
create policy "Participants can read own active specialist relations"
on public.client_specialist_relations
for select
to authenticated
using (
  status = 'active'
  and auth.uid() in (client_id, specialist_id)
);

drop policy if exists "Participants can read own active chat messages" on public.chat_messages;
create policy "Participants can read own active chat messages"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.client_specialist_relations relation
    where relation.id = chat_messages.relation_id
      and relation.status = 'active'
      and auth.uid() in (relation.client_id, relation.specialist_id)
  )
);

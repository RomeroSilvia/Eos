-- Chat media support migration.
-- Ensures relations/messages tables, image metadata columns, and private chat-media bucket exist.

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

alter table public.chat_messages
add column if not exists message_type text not null default 'text'
  check (message_type in ('text', 'image')),
add column if not exists media_path text,
add column if not exists media_mime_type text,
add column if not exists media_size integer;

alter table public.chat_messages
drop constraint if exists chat_messages_content_check;

alter table public.chat_messages
drop constraint if exists chat_messages_content_by_type_check;

alter table public.chat_messages
add constraint chat_messages_content_by_type_check
check (
  (
    message_type = 'text'
    and length(trim(content)) between 1 and 1000
  )
  or
  (
    message_type = 'image'
    and length(content) <= 1000
  )
) not valid;

alter table public.chat_messages
drop constraint if exists chat_messages_media_consistency_check;

alter table public.chat_messages
add constraint chat_messages_media_consistency_check
check (
  (
    message_type = 'text'
    and media_path is null
    and media_mime_type is null
    and media_size is null
  )
  or
  (
    message_type = 'image'
    and media_path is not null
    and media_mime_type in ('image/jpeg', 'image/png', 'image/webp')
    and media_size between 1 and 15728640
  )
) not valid;

create index if not exists chat_messages_relation_media_idx
on public.chat_messages(relation_id, message_type)
where media_path is not null;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

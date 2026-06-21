-- Modulo 5: chat messages media columns and Realtime publication.
-- Idempotent migration. Safe to run after the base chat schema.

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

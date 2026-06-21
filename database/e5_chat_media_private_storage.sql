-- Modulo 5: private chat image attachments.
-- Idempotent migration. Run after the base chat schema migration.

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
drop constraint if exists chat_messages_media_consistency_check;

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
);

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
);

create index if not exists chat_messages_relation_media_idx
on public.chat_messages(relation_id, message_type)
where media_path is not null;

drop policy if exists "Participants can upload own chat media" on storage.objects;
create policy "Participants can upload own chat media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and auth.uid()::text = (storage.foldername(name))[2]
  and exists (
    select 1
    from public.client_specialist_relations relation
    where relation.id::text = (storage.foldername(name))[1]
      and relation.status = 'active'
      and auth.uid() in (relation.client_id, relation.specialist_id)
  )
);

drop policy if exists "Participants can read own chat media" on storage.objects;
create policy "Participants can read own chat media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and exists (
    select 1
    from public.client_specialist_relations relation
    where relation.id::text = (storage.foldername(name))[1]
      and relation.status = 'active'
      and auth.uid() in (relation.client_id, relation.specialist_id)
  )
);

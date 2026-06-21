-- Supabase Storage setup for private specialist verification documents.
-- Run this in Supabase SQL editor or include it in your database migration flow.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'specialist-docs',
  'specialist-docs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users can upload own specialist docs" on storage.objects;
create policy "Users can upload own specialist docs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'specialist-docs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read own specialist docs" on storage.objects;
create policy "Users can read own specialist docs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'specialist-docs'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
      and role = 'center_admin'
    )
  )
);

-- Fix: Allow center_admin users to view specialist documents
-- This policy update allows admin users to generate signed URLs for specialist documents.
-- Previously, only the document owner could view them, preventing admins from verifying documents.

drop policy if exists "Users can read own specialist docs" on storage.objects;

create policy "Users can read own specialist docs or admins can read all"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'specialist-docs'
  and (
    -- Users can read their own documents
    auth.uid()::text = (storage.foldername(name))[1]
    -- OR center_admins can read all documents for verification
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
      and role = 'center_admin'
    )
  )
);

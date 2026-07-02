-- E3-M3 center images storage.
-- Public read follows product-images behavior because centers.image_url stores a public URL.
-- Writes are scoped to center_admins and the first path segment must be the center id.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'center-images',
  'center-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read center images'
  ) then
    create policy "Public read center images"
    on storage.objects
    for select
    using (bucket_id = 'center-images');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Center admins can upload center images'
  ) then
    create policy "Center admins can upload center images"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'center-images'
      and exists (
        select 1
        from public.center_admins center_admin
        join public.profiles profile
          on profile.id = center_admin.user_id
        where center_admin.user_id = auth.uid()
          and center_admin.role = 'center_admin'
          and profile.role = 'center_admin'
          and center_admin.center_id::text = (storage.foldername(name))[1]
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Center admins can update center images'
  ) then
    create policy "Center admins can update center images"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'center-images'
      and exists (
        select 1
        from public.center_admins center_admin
        join public.profiles profile
          on profile.id = center_admin.user_id
        where center_admin.user_id = auth.uid()
          and center_admin.role = 'center_admin'
          and profile.role = 'center_admin'
          and center_admin.center_id::text = (storage.foldername(name))[1]
      )
    )
    with check (
      bucket_id = 'center-images'
      and exists (
        select 1
        from public.center_admins center_admin
        join public.profiles profile
          on profile.id = center_admin.user_id
        where center_admin.user_id = auth.uid()
          and center_admin.role = 'center_admin'
          and profile.role = 'center_admin'
          and center_admin.center_id::text = (storage.foldername(name))[1]
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Center admins can delete center images'
  ) then
    create policy "Center admins can delete center images"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'center-images'
      and exists (
        select 1
        from public.center_admins center_admin
        join public.profiles profile
          on profile.id = center_admin.user_id
        where center_admin.user_id = auth.uid()
          and center_admin.role = 'center_admin'
          and profile.role = 'center_admin'
          and center_admin.center_id::text = (storage.foldername(name))[1]
      )
    );
  end if;
end $$;

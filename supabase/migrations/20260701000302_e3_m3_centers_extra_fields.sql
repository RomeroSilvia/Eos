-- E3-M3 centers extra visible fields.
-- Safe for existing data: nullable columns only.

alter table public.centers
  add column if not exists city text null,
  add column if not exists province text null,
  add column if not exists image_url text null;

-- TODO: define center-images storage ownership/read policy before adding a bucket.
-- Existing product-images storage policy is user-folder based and does not map
-- cleanly to center_admins scoped access.

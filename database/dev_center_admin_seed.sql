-- Development/demo seed for EOS Entrega 2 Module 3.
-- DO NOT use this account or password in production.
-- Fake admin email: admin.fake@example.test
-- Fake admin development password: Admin1234!
--
-- Recommended safe flow:
-- 1. In Supabase Dashboard -> Authentication -> Add user:
--    email: admin.fake@example.test
--    password: Admin1234!
--    mark email as confirmed.
-- 2. Run this SQL in Supabase SQL Editor to ensure profiles.role = 'center_admin'.
--
-- This file does not expose service_role and does not disable RLS.

do $$
declare
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from auth.users
  where email = 'admin.fake@example.test'
  limit 1;

  if admin_user_id is null then
    raise notice 'Admin auth user does not exist. Create it manually in Supabase Dashboard -> Authentication -> Add user with email admin.fake@example.test and password Admin1234!, then run this seed again.';
    return;
  end if;

  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = admin_user_id;

  insert into public.profiles (id, email, full_name, role)
  values (
    admin_user_id,
    'admin.fake@example.test',
    'Admin Fake',
    'center_admin'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = 'center_admin',
    updated_at = now();

  raise notice 'Development center_admin profile ready for admin.fake@example.test. Password is Admin1234! if you created the Auth user as documented.';
end $$;

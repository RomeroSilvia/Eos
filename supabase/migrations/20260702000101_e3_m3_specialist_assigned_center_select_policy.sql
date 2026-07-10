-- E3-M3: allow specialists to read their assigned active center.
-- Safe for existing data: adds a SELECT policy only.

create policy "Specialists can read assigned active center"
on public.centers
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.specialist_profiles sp
    where sp.user_id = auth.uid()
      and sp.center_id = centers.id
  )
);

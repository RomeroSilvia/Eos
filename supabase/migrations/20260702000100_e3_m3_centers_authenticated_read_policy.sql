-- E3-M3: authenticated users can read active centers.
-- Safe for existing data: adds a SELECT policy only.

create policy "Authenticated users can read active centers"
on public.centers
for select
to authenticated
using (
  is_active = true
);

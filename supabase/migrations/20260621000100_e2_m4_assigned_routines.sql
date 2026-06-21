-- Modulo 4: specialist-assigned routines.
-- Idempotent migration for Supabase CLI migrations folder.

alter table public.routines
add column if not exists assigned_by uuid references public.profiles(id) on delete set null;

create index if not exists routines_assigned_by_idx
on public.routines(assigned_by)
where assigned_by is not null;

create index if not exists routines_user_assigned_by_idx
on public.routines(user_id, assigned_by);

drop policy if exists "Specialists can create assigned routines for active patients" on public.routines;
create policy "Specialists can create assigned routines for active patients"
on public.routines
for insert
to authenticated
with check (
  assigned_by = auth.uid()
  and exists (
    select 1
    from public.client_specialist_relations relation
    where relation.status = 'active'
      and relation.client_id = routines.user_id
      and (
        relation.specialist_id = auth.uid()
        or exists (
          select 1
          from public.specialist_profiles specialist_profile
          where specialist_profile.user_id = auth.uid()
            and specialist_profile.id = relation.specialist_id
        )
      )
  )
);

drop policy if exists "Specialists can update routines they assigned" on public.routines;
create policy "Specialists can update routines they assigned"
on public.routines
for update
to authenticated
using (assigned_by = auth.uid())
with check (assigned_by = auth.uid());

drop policy if exists "Specialists can delete routines they assigned" on public.routines;
create policy "Specialists can delete routines they assigned"
on public.routines
for delete
to authenticated
using (assigned_by = auth.uid());

drop policy if exists "Specialists can create steps in routines they assigned" on public.routine_steps;
create policy "Specialists can create steps in routines they assigned"
on public.routine_steps
for insert
to authenticated
with check (
  exists (
    select 1
    from public.routines routine
    where routine.id = routine_steps.routine_id
      and routine.assigned_by = auth.uid()
  )
);

drop policy if exists "Specialists can update steps in routines they assigned" on public.routine_steps;
create policy "Specialists can update steps in routines they assigned"
on public.routine_steps
for update
to authenticated
using (
  exists (
    select 1
    from public.routines routine
    where routine.id = routine_steps.routine_id
      and routine.assigned_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.routines routine
    where routine.id = routine_steps.routine_id
      and routine.assigned_by = auth.uid()
  )
);

drop policy if exists "Specialists can delete steps in routines they assigned" on public.routine_steps;
create policy "Specialists can delete steps in routines they assigned"
on public.routine_steps
for delete
to authenticated
using (
  exists (
    select 1
    from public.routines routine
    where routine.id = routine_steps.routine_id
      and routine.assigned_by = auth.uid()
  )
);

drop policy if exists "Specialists can create products in assigned routine steps" on public.routine_step_products;
create policy "Specialists can create products in assigned routine steps"
on public.routine_step_products
for insert
to authenticated
with check (
  exists (
    select 1
    from public.routine_steps step
    join public.routines routine on routine.id = step.routine_id
    where step.id = routine_step_products.step_id
      and routine.assigned_by = auth.uid()
  )
);

drop policy if exists "Specialists can delete products in assigned routine steps" on public.routine_step_products;
create policy "Specialists can delete products in assigned routine steps"
on public.routine_step_products
for delete
to authenticated
using (
  exists (
    select 1
    from public.routine_steps step
    join public.routines routine on routine.id = step.routine_id
    where step.id = routine_step_products.step_id
      and routine.assigned_by = auth.uid()
  )
);

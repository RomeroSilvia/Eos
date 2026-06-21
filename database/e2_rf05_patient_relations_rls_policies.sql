-- E2-RF-05 patient management RLS policy proposal.
-- Review in Supabase before applying in production.
-- This file intentionally does not enable RLS. Enable RLS only after confirming
-- existing insert/update/delete policies for auth, quiz, routines and products.

drop policy if exists "Participants can read their specialist relations" on public.client_specialist_relations;
create policy "Participants can read their specialist relations"
on public.client_specialist_relations
for select
to authenticated
using (
  status = 'active'
  and (
    client_id = auth.uid()
    or specialist_id = auth.uid()
    or exists (
      select 1
      from public.specialist_profiles specialist_profile
      where specialist_profile.user_id = auth.uid()
        and specialist_profile.id = client_specialist_relations.specialist_id
    )
  )
);

drop policy if exists "Specialists can read associated patient profiles" on public.profiles;
create policy "Specialists can read associated patient profiles"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.client_specialist_relations relation
    where relation.status = 'active'
      and (
        (
          (
            relation.specialist_id = auth.uid()
            or exists (
              select 1
              from public.specialist_profiles specialist_profile
              where specialist_profile.user_id = auth.uid()
                and specialist_profile.id = relation.specialist_id
            )
          )
          and relation.client_id = profiles.id
        )
        or (relation.client_id = auth.uid() and relation.specialist_id = profiles.id)
      )
  )
);

drop policy if exists "Specialists can read associated patient skin profiles" on public.skin_profiles;
create policy "Specialists can read associated patient skin profiles"
on public.skin_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.client_specialist_relations relation
    where relation.status = 'active'
      and (
        relation.specialist_id = auth.uid()
        or exists (
          select 1
          from public.specialist_profiles specialist_profile
          where specialist_profile.user_id = auth.uid()
            and specialist_profile.id = relation.specialist_id
        )
      )
      and relation.client_id = skin_profiles.user_id
  )
);

drop policy if exists "Specialists can read associated patient routines" on public.routines;
create policy "Specialists can read associated patient routines"
on public.routines
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.client_specialist_relations relation
    where relation.status = 'active'
      and (
        relation.specialist_id = auth.uid()
        or exists (
          select 1
          from public.specialist_profiles specialist_profile
          where specialist_profile.user_id = auth.uid()
            and specialist_profile.id = relation.specialist_id
        )
      )
      and relation.client_id = routines.user_id
  )
);

drop policy if exists "Specialists can read associated patient routine logs" on public.routine_logs;
create policy "Specialists can read associated patient routine logs"
on public.routine_logs
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.client_specialist_relations relation
    where relation.status = 'active'
      and (
        relation.specialist_id = auth.uid()
        or exists (
          select 1
          from public.specialist_profiles specialist_profile
          where specialist_profile.user_id = auth.uid()
            and specialist_profile.id = relation.specialist_id
        )
      )
      and relation.client_id = routine_logs.user_id
  )
);

drop policy if exists "Specialists can read associated patient routine steps" on public.routine_steps;
create policy "Specialists can read associated patient routine steps"
on public.routine_steps
for select
to authenticated
using (
  exists (
    select 1
    from public.routines routine
    where routine.id = routine_steps.routine_id
      and (
        routine.user_id = auth.uid()
        or exists (
          select 1
          from public.client_specialist_relations relation
          where relation.status = 'active'
            and (
              relation.specialist_id = auth.uid()
              or exists (
                select 1
                from public.specialist_profiles specialist_profile
                where specialist_profile.user_id = auth.uid()
                  and specialist_profile.id = relation.specialist_id
              )
            )
            and relation.client_id = routine.user_id
        )
      )
  )
);

drop policy if exists "Specialists can read associated patient routine step logs" on public.routine_step_logs;
create policy "Specialists can read associated patient routine step logs"
on public.routine_step_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.routine_logs routine_log
    join public.routines routine on routine.id = routine_log.routine_id
    where routine_log.id = routine_step_logs.routine_log_id
      and (
        routine_log.user_id = auth.uid()
        or exists (
          select 1
          from public.client_specialist_relations relation
          where relation.status = 'active'
            and (
              relation.specialist_id = auth.uid()
              or exists (
                select 1
                from public.specialist_profiles specialist_profile
                where specialist_profile.user_id = auth.uid()
                  and specialist_profile.id = relation.specialist_id
              )
            )
            and relation.client_id = routine.user_id
        )
      )
  )
);

drop policy if exists "Specialists can read associated patient step products" on public.routine_step_products;
create policy "Specialists can read associated patient step products"
on public.routine_step_products
for select
to authenticated
using (
  exists (
    select 1
    from public.routine_steps step
    join public.routines routine on routine.id = step.routine_id
    where step.id = routine_step_products.step_id
      and (
        routine.user_id = auth.uid()
        or exists (
          select 1
          from public.client_specialist_relations relation
          where relation.status = 'active'
            and (
              relation.specialist_id = auth.uid()
              or exists (
                select 1
                from public.specialist_profiles specialist_profile
                where specialist_profile.user_id = auth.uid()
                  and specialist_profile.id = relation.specialist_id
              )
            )
            and relation.client_id = routine.user_id
        )
      )
  )
);

drop policy if exists "Specialists can read associated patient products" on public.products;
create policy "Specialists can read associated patient products"
on public.products
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.client_specialist_relations relation
    where relation.status = 'active'
      and (
        relation.specialist_id = auth.uid()
        or exists (
          select 1
          from public.specialist_profiles specialist_profile
          where specialist_profile.user_id = auth.uid()
            and specialist_profile.id = relation.specialist_id
        )
      )
      and relation.client_id = products.user_id
  )
);

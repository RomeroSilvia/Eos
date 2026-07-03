-- E3 M5 - Metrics helper views and indexes.

create or replace view public.vw_e3_global_summary as
select
  (select count(*) from public.profiles where role = 'user') as clients,
  (select count(*) from public.specialist_profiles where license_status = 'verified') as active_specialists,
  (select count(*) from public.chat_messages) as consultations,
  (select count(*) from public.routines where assigned_by is not null) as assigned_routines,
  (
    select coalesce(round(avg(completion_percentage)::numeric, 2), 0)
    from public.routine_logs
  ) as average_compliance;

create index if not exists chat_messages_created_at_idx
on public.chat_messages(created_at);

create index if not exists routines_assigned_by_idx
on public.routines(assigned_by)
where assigned_by is not null;

create index if not exists routine_logs_user_log_date_idx
on public.routine_logs(user_id, log_date);

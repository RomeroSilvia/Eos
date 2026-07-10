-- E3 M4 - Minimal audit logs schema used by backend recordAuditLog helper.

create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_entity_id_created_at_idx
on public.audit_logs(entity, entity_id, created_at desc);

create index if not exists audit_logs_actor_id_created_at_idx
on public.audit_logs(actor_id, created_at desc);

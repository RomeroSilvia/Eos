-- Module 5: allow chat_messages inserts for active relation participants.
-- Idempotent migration.

alter table public.chat_messages enable row level security;

drop policy if exists "Participants can insert own active chat messages" on public.chat_messages;
create policy "Participants can insert own active chat messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.client_specialist_relations relation
    where relation.id = chat_messages.relation_id
      and relation.status = 'active'
      and auth.uid() in (relation.client_id, relation.specialist_id)
  )
);

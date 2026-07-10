-- Modulo 5: habilita escritura segura en chat_messages para participantes del chat.
-- Idempotente: puede ejecutarse multiples veces.

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

-- Wardrobe Assistant — direct messages between accepted friends.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once (every statement is guarded).

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id),
  check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists messages_sender_idx on messages(sender_id);
create index if not exists messages_recipient_idx on messages(recipient_id);
create index if not exists messages_conversation_idx
  on messages(least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);

alter table messages enable row level security;
grant select, insert on messages to authenticated;

drop policy if exists "messages visible to sender or recipient" on messages;
create policy "messages visible to sender or recipient" on messages
  for select to authenticated
  using (
    sender_id in (select id from profiles where user_id = auth.uid())
    or recipient_id in (select id from profiles where user_id = auth.uid())
  );

drop policy if exists "messages insert to an accepted friend" on messages;
create policy "messages insert to an accepted friend" on messages
  for insert to authenticated
  with check (
    sender_id in (select id from profiles where user_id = auth.uid())
    and exists (
      select 1 from friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.requester_id = recipient_id and fr.addressee_id in (select id from profiles where user_id = auth.uid()))
          or (fr.addressee_id = recipient_id and fr.requester_id in (select id from profiles where user_id = auth.uid()))
        )
    )
  );

-- No update/delete policies for v1 — messages are immutable once sent.

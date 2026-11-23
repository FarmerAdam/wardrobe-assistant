-- Wardrobe Assistant — friends + outfit reactions.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once (every statement is guarded).

create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friend_requests_requester_idx on friend_requests(requester_id);
create index if not exists friend_requests_addressee_idx on friend_requests(addressee_id);

create table if not exists outfit_reactions (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references outfits(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (outfit_id, profile_id)
);

create index if not exists outfit_reactions_outfit_idx on outfit_reactions(outfit_id);

alter table friend_requests enable row level security;
alter table outfit_reactions enable row level security;
grant select, insert, update, delete on friend_requests to authenticated;
grant select, insert, update, delete on outfit_reactions to authenticated;

-- friend_requests: see/manage rows you're a party to; only the addressee can accept.
drop policy if exists "friend_requests visible to either party" on friend_requests;
create policy "friend_requests visible to either party" on friend_requests
  for select to authenticated
  using (
    requester_id in (select id from profiles where user_id = auth.uid())
    or addressee_id in (select id from profiles where user_id = auth.uid())
  );
drop policy if exists "friend_requests insert as requester" on friend_requests;
create policy "friend_requests insert as requester" on friend_requests
  for insert to authenticated
  with check (requester_id in (select id from profiles where user_id = auth.uid()));
drop policy if exists "friend_requests addressee can accept" on friend_requests;
create policy "friend_requests addressee can accept" on friend_requests
  for update to authenticated
  using (addressee_id in (select id from profiles where user_id = auth.uid()))
  with check (addressee_id in (select id from profiles where user_id = auth.uid()));
drop policy if exists "friend_requests either party can delete" on friend_requests;
create policy "friend_requests either party can delete" on friend_requests
  for delete to authenticated
  using (
    requester_id in (select id from profiles where user_id = auth.uid())
    or addressee_id in (select id from profiles where user_id = auth.uid())
  );

-- outfits: ADD friend visibility alongside the existing owner-only "for all" policy
-- (Postgres ORs multiple permissive policies for the same command, so this only
-- widens SELECT — insert/update/delete stay owner-only via the existing policy).
drop policy if exists "outfits visible to accepted friends" on outfits;
create policy "outfits visible to accepted friends" on outfits
  for select to authenticated
  using (
    exists (
      select 1 from friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.requester_id = outfits.profile_id and fr.addressee_id in (select id from profiles where user_id = auth.uid()))
          or (fr.addressee_id = outfits.profile_id and fr.requester_id in (select id from profiles where user_id = auth.uid()))
        )
    )
  );

-- items: friends can see only items that appear inside a saved+visible outfit
-- (not the whole closet) — deliberately narrower than the outfits policy above.
drop policy if exists "items visible via a friend's saved outfit" on items;
create policy "items visible via a friend's saved outfit" on items
  for select to authenticated
  using (
    exists (
      select 1 from outfits o
      join friend_requests fr on (
        (fr.requester_id = o.profile_id and fr.addressee_id in (select id from profiles where user_id = auth.uid()))
        or (fr.addressee_id = o.profile_id and fr.requester_id in (select id from profiles where user_id = auth.uid()))
      )
      where fr.status = 'accepted' and items.id = any(o.item_ids)
    )
  );

-- outfit_reactions: react to your own or a friend's outfit; manage only your own reaction row.
drop policy if exists "outfit_reactions visible if you can see the outfit" on outfit_reactions;
create policy "outfit_reactions visible if you can see the outfit" on outfit_reactions
  for select to authenticated
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
    or outfit_id in (select id from outfits where profile_id in (select id from profiles where user_id = auth.uid()))
  );
drop policy if exists "outfit_reactions manage own" on outfit_reactions;
create policy "outfit_reactions manage own" on outfit_reactions
  for all to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
    and exists (
      select 1 from outfits o
      where o.id = outfit_id
        and (
          o.profile_id in (select id from profiles where user_id = auth.uid())
          or exists (
            select 1 from friend_requests fr
            where fr.status = 'accepted'
              and ((fr.requester_id = o.profile_id and fr.addressee_id in (select id from profiles where user_id = auth.uid()))
                or (fr.addressee_id = o.profile_id and fr.requester_id in (select id from profiles where user_id = auth.uid())))
          )
        )
    )
  );

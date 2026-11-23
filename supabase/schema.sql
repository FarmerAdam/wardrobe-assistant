-- Wardrobe Assistant schema
-- Run this in the Supabase SQL editor once the new project is created.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- One row per person using the app (starts with just her, but built for more than one profile)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  -- style quiz answers captured at setup, e.g. { "styles": ["minimalist","streetwear"], "favorite_colors": ["black","olive"], "avoid": ["neon"] }
  style_profile jsonb not null default '{}'::jsonb,
  -- Accounts (added 2026-09-04 for friends + chat). A profile with a
  -- user_id is owned by a logged-in account; username is what friends
  -- type to find each other.
  user_id uuid references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- One username per person, one profile per account, both case-insensitive-safe.
create unique index if not exists profiles_username_key on profiles (username);
create unique index if not exists profiles_user_id_key on profiles (user_id);

-- One row per photographed clothing item
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  photo_url text not null,
  category text not null check (category in ('top','jumper','bottom','dress','shoes','outerwear','jacket','accessory')),
  primary_color text not null,
  secondary_color text,
  pattern text not null default 'solid', -- solid, striped, floral, plaid, graphic, other
  formality smallint not null default 2 check (formality between 1 and 5), -- 1 = very casual, 5 = very dressy
  warmth smallint not null default 2 check (warmth between 1 and 3), -- 1 light, 2 medium, 3 heavy
  mood_tags text[] not null default '{}', -- e.g. {'cozy','confident'}
  style_tags text[] not null default '{}', -- e.g. {'minimalist','streetwear'}
  last_worn_at timestamptz,
  in_laundry boolean not null default false,
  -- true lets a still-"recently worn" item (see recentlyWorn.ts) be
  -- suggested in outfits anyway, as a manually granted exception.
  recently_worn_exception boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists items_profile_id_idx on items(profile_id);
create index if not exists items_category_idx on items(category);

-- Saved/favorited outfit combos (a snapshot of item ids that worked well together)
create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  mood text not null,
  item_ids uuid[] not null,
  is_favorite boolean not null default false,
  worn_at timestamptz,
  created_at timestamptz not null default now()
);

-- One row per date a profile has marked in advance as "not a uniform day"
-- (a casual clothes day, or a school holiday). Added 2026-09-07 for the
-- dress code / uniform lock feature — see
-- supabase/migration_2026-09-07_calendar_marks.sql for the applied history.
create table if not exists calendar_marks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  day_type text not null check (day_type in ('casual','holiday')),
  created_at timestamptz not null default now(),
  unique (profile_id, date)
);

create index if not exists calendar_marks_profile_id_idx on calendar_marks(profile_id);

-- Friend requests (added 2026-09-13). One row per requester/addressee pair;
-- "are we friends" = an accepted row exists between the two ids, either
-- direction. See supabase/migration_2026-09-13_friends_and_reactions.sql.
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

-- One reaction (a single emoji) per person per saved outfit. Added
-- 2026-09-13 alongside friend_requests.
create table if not exists outfit_reactions (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references outfits(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (outfit_id, profile_id)
);

create index if not exists outfit_reactions_outfit_idx on outfit_reactions(outfit_id);

-- Direct messages between accepted friends (added 2026-09-14). No thread
-- table — a conversation is just every row where {sender,recipient} match
-- the pair. Immutable: no update/delete policy exists for this table.
-- See supabase/migration_2026-09-14_messages.sql.
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

-- Row Level Security (locked down 2026-09-05, once accounts existed —
-- see supabase/migration_2026-09-05_lockdown.sql for the applied history).
-- Model: profiles are readable by anyone logged in (needed for username
-- search / seeing a friend's name+photo before connecting), but each
-- person can only write their own row. items, outfits and calendar_marks
-- are fully private to their owner.
alter table profiles enable row level security;
alter table items enable row level security;
alter table outfits enable row level security;
alter table calendar_marks enable row level security;
alter table friend_requests enable row level security;
alter table outfit_reactions enable row level security;
alter table messages enable row level security;

grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on items to authenticated;
grant select, insert, update, delete on outfits to authenticated;
grant select, insert, update, delete on calendar_marks to authenticated;
grant select, insert, update, delete on friend_requests to authenticated;
grant select, insert, update, delete on outfit_reactions to authenticated;
grant select, insert on messages to authenticated;

create policy "profiles readable by anyone logged in" on profiles
  for select to authenticated using (true);
create policy "profiles insert own row" on profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "profiles update own row" on profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "items owner full access" on items
  for all to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "outfits owner full access" on outfits
  for all to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "calendar_marks owner full access" on calendar_marks
  for all to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "friend_requests visible to either party" on friend_requests
  for select to authenticated
  using (
    requester_id in (select id from profiles where user_id = auth.uid())
    or addressee_id in (select id from profiles where user_id = auth.uid())
  );
create policy "friend_requests insert as requester" on friend_requests
  for insert to authenticated
  with check (requester_id in (select id from profiles where user_id = auth.uid()));
create policy "friend_requests addressee can accept" on friend_requests
  for update to authenticated
  using (addressee_id in (select id from profiles where user_id = auth.uid()))
  with check (addressee_id in (select id from profiles where user_id = auth.uid()));
create policy "friend_requests either party can delete" on friend_requests
  for delete to authenticated
  using (
    requester_id in (select id from profiles where user_id = auth.uid())
    or addressee_id in (select id from profiles where user_id = auth.uid())
  );

-- Friends can see a profile's saved outfits, in addition to the owner
-- (Postgres ORs multiple permissive SELECT policies, so this only widens
-- reads — insert/update/delete stay owner-only via the policy above).
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

-- Friends can see only the specific items that appear inside a saved
-- outfit they can already see (not the whole closet).
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

create policy "outfit_reactions visible if you can see the outfit" on outfit_reactions
  for select to authenticated
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
    or outfit_id in (select id from outfits where profile_id in (select id from profiles where user_id = auth.uid()))
  );
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

create policy "messages visible to sender or recipient" on messages
  for select to authenticated
  using (
    sender_id in (select id from profiles where user_id = auth.uid())
    or recipient_id in (select id from profiles where user_id = auth.uid())
  );
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

-- Storage: the `item-photos` bucket lives in the shared storage.objects /
-- storage.buckets tables, so instead of touching their RLS wholesale,
-- scope policies to just this bucket. storage.buckets needs its own SELECT
-- policy too -- without it, the Storage API can't find the bucket's row to
-- validate an upload against and reports "Bucket not found" even though the
-- bucket exists and is marked public. Reads stay public (photos need to
-- load for anyone with the URL); writes are restricted to your own
-- "<profile_id>/..." folder.
grant select on storage.buckets to anon, authenticated;

create policy "public read item-photos bucket" on storage.buckets
  for select to public using (id = 'item-photos');

create policy "public read item-photos" on storage.objects
  for select to public using (bucket_id = 'item-photos');

create policy "owner upload item-photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] in (select id::text from profiles where user_id = auth.uid())
  );
create policy "owner update item-photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] in (select id::text from profiles where user_id = auth.uid())
  );
create policy "owner delete item-photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] in (select id::text from profiles where user_id = auth.uid())
  );

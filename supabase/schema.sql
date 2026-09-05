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

-- Row Level Security (locked down 2026-09-05, once accounts existed —
-- see supabase/migration_2026-09-05_lockdown.sql for the applied history).
-- Model: profiles are readable by anyone logged in (needed for username
-- search / seeing a friend's name+photo before connecting), but each
-- person can only write their own row. items and outfits are fully
-- private to their owner.
alter table profiles enable row level security;
alter table items enable row level security;
alter table outfits enable row level security;

grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on items to authenticated;
grant select, insert, update, delete on outfits to authenticated;

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

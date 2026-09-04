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

-- Row Level Security: intentionally OFF for now, since this starts as a
-- single-family, single-device app with no auth yet. New Supabase projects
-- can enable RLS by default even on plain `create table` statements, which
-- blocks all access until policies exist — so disable it explicitly here.
alter table profiles disable row level security;
alter table items disable row level security;
alter table outfits disable row level security;

grant select, insert, update, delete on profiles to anon, authenticated;
grant select, insert, update, delete on items to anon, authenticated;
grant select, insert, update, delete on outfits to anon, authenticated;

-- When you add Supabase Auth later, re-enable RLS on each table and add
-- policies like:
-- alter table items enable row level security;
-- create policy "owner can read/write own items" on items
--   using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Storage: the `item-photos` bucket lives in the shared storage.objects /
-- storage.buckets tables, so instead of disabling their RLS wholesale,
-- scope policies to just this bucket. storage.buckets needs its own SELECT
-- policy too -- without it, the Storage API can't find the bucket's row to
-- validate an upload against and reports "Bucket not found" even though the
-- bucket exists and is marked public.
grant select on storage.buckets to anon, authenticated;

create policy "public read item-photos bucket" on storage.buckets
  for select to public using (id = 'item-photos');

create policy "public read item-photos" on storage.objects
  for select to public using (bucket_id = 'item-photos');
create policy "public upload item-photos" on storage.objects
  for insert to public with check (bucket_id = 'item-photos');
create policy "public update item-photos" on storage.objects
  for update to public using (bucket_id = 'item-photos');
create policy "public delete item-photos" on storage.objects
  for delete to public using (bucket_id = 'item-photos');

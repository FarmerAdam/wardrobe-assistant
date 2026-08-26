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
  created_at timestamptz not null default now()
);

-- One row per photographed clothing item
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  photo_url text not null,
  category text not null check (category in ('top','bottom','dress','shoes','outerwear','accessory')),
  primary_color text not null,
  secondary_color text,
  pattern text not null default 'solid', -- solid, striped, floral, plaid, graphic, other
  formality smallint not null default 2 check (formality between 1 and 5), -- 1 = very casual, 5 = very dressy
  warmth smallint not null default 2 check (warmth between 1 and 3), -- 1 light, 2 medium, 3 heavy
  mood_tags text[] not null default '{}', -- e.g. {'cozy','confident'}
  style_tags text[] not null default '{}', -- e.g. {'minimalist','streetwear'}
  last_worn_at timestamptz,
  in_laundry boolean not null default false,
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

-- Storage: the `item-photos` bucket lives in the shared storage.objects
-- table, so instead of disabling its RLS wholesale, scope policies to just
-- this bucket.
create policy "public read item-photos" on storage.objects
  for select to public using (bucket_id = 'item-photos');
create policy "public upload item-photos" on storage.objects
  for insert to public with check (bucket_id = 'item-photos');
create policy "public update item-photos" on storage.objects
  for update to public using (bucket_id = 'item-photos');
create policy "public delete item-photos" on storage.objects
  for delete to public using (bucket_id = 'item-photos');

-- Wardrobe Assistant — lock the database down now that accounts exist.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Model: profiles are readable by any logged-in user (needed for username
-- search / seeing a friend's name+photo before you connect), but each
-- person can only write their own row. items and outfits are fully
-- private to their owner. Storage stays publicly readable (photos need to
-- load in <img>/<Image> tags and, later, in a friend's shared outfit) but
-- uploads/edits/deletes are restricted to your own folder.
--
-- Nothing here requires an app code change — every query already goes
-- through the logged-in user's own profile_id.

alter table profiles enable row level security;
alter table items enable row level security;
alter table outfits enable row level security;

-- profiles: anyone logged in can look people up; you can only write your own row.
drop policy if exists "profiles readable by anyone logged in" on profiles;
create policy "profiles readable by anyone logged in" on profiles
  for select to authenticated using (true);

drop policy if exists "profiles insert own row" on profiles;
create policy "profiles insert own row" on profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "profiles update own row" on profiles;
create policy "profiles update own row" on profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- items: private to the owning account.
drop policy if exists "items owner full access" on items;
create policy "items owner full access" on items
  for all to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

-- outfits: private to the owning account.
drop policy if exists "outfits owner full access" on outfits;
create policy "outfits owner full access" on outfits
  for all to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

-- Storage: item-photos stays publicly readable, but only the owning
-- account can upload/replace/delete into their own profile-id folder
-- (files are stored at "<profile_id>/<filename>").
drop policy if exists "public upload item-photos" on storage.objects;
drop policy if exists "public update item-photos" on storage.objects;
drop policy if exists "public delete item-photos" on storage.objects;

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

-- "public read item-photos" (select, unrestricted) stays as-is — photos
-- need to load for anyone with the URL.

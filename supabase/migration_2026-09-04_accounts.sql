-- Wardrobe Assistant — add login accounts to an existing database.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once (every statement is guarded).

alter table profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table profiles add column if not exists username text;
alter table profiles add column if not exists avatar_url text;

create unique index if not exists profiles_username_key on profiles (username);
create unique index if not exists profiles_user_id_key on profiles (user_id);

-- Row Level Security stays OFF for now (same as the rest of the app) — it
-- gets turned on in the next step, once the friends/chat tables exist.

-- ----------------------------------------------------------------------
-- ALSO required, in the dashboard UI (not SQL):
--   Authentication -> Sign In / Providers -> Email
--     * "Email" provider: enabled  (usually already on)
--     * "Confirm email": OFF
-- The app logs people in with a synthetic email built from their username,
-- so there is no inbox to confirm from.
-- ----------------------------------------------------------------------

-- Wardrobe Assistant — dress code / uniform lock.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once (every statement is guarded).
--
-- One row per date a profile has marked in advance as "not a uniform day"
-- (a casual clothes day, or a school holiday). The app locks the Mood tab
-- on any weekday with no matching row for today.

create table if not exists calendar_marks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  day_type text not null check (day_type in ('casual','holiday')),
  created_at timestamptz not null default now(),
  unique (profile_id, date)
);

create index if not exists calendar_marks_profile_id_idx on calendar_marks(profile_id);

alter table calendar_marks enable row level security;
grant select, insert, update, delete on calendar_marks to authenticated;

drop policy if exists "calendar_marks owner full access" on calendar_marks;
create policy "calendar_marks owner full access" on calendar_marks
  for all to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

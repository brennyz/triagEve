-- triagEve database setup. Plak dit in Supabase > SQL Editor > New query en klik Run.
-- Werkt ook in een project dat door andere apps gebruikt wordt: alleen het
-- triagEve team-account kan bij deze tabellen.

create table if not exists public.triageve_messages (
  id bigint generated always as identity primary key,
  author text not null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.triageve_diary (
  id bigint generated always as identity primary key,
  author text not null,
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.triageve_meetings (
  id bigint generated always as identity primary key,
  title text not null,
  date date not null,
  time text,
  who text[] not null default '{}',
  agenda text,
  happened text,
  actions text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.triageve_messages enable row level security;
alter table public.triageve_diary enable row level security;
alter table public.triageve_meetings enable row level security;

-- Moet gelijk zijn aan TEAM_EMAIL in config.js.
create or replace function public.triageve_is_team() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'team@triageve.app'
$$;

drop policy if exists "triageve team" on public.triageve_messages;
drop policy if exists "triageve team" on public.triageve_diary;
drop policy if exists "triageve team" on public.triageve_meetings;

create policy "triageve team" on public.triageve_messages for all to authenticated
  using (public.triageve_is_team()) with check (public.triageve_is_team());
create policy "triageve team" on public.triageve_diary for all to authenticated
  using (public.triageve_is_team()) with check (public.triageve_is_team());
create policy "triageve team" on public.triageve_meetings for all to authenticated
  using (public.triageve_is_team()) with check (public.triageve_is_team());

-- Live updates (chat zonder verversen).
alter publication supabase_realtime add table
  public.triageve_messages, public.triageve_diary, public.triageve_meetings;

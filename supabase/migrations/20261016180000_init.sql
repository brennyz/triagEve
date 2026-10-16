-- triagEve basis: chat, dagboek, overleg.
-- Wordt automatisch uitgevoerd door .github/workflows/supabase.yml (supabase db push).
-- Alleen het team-account (TEAM_EMAIL in config.js) kan bij deze tabellen.

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

create or replace function public.triageve_is_team() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'team@triageve.app'
$$;

-- Zet RLS + team-policy + realtime op een tabel. Gebruik dit in elke volgende migratie:
--   select public.triageve_secure('triageve_nieuwe_tabel');
create or replace function public.triageve_secure(tbl text) returns void
language plpgsql as $$
begin
  execute format('alter table public.%I enable row level security', tbl);
  execute format('drop policy if exists "triageve team" on public.%I', tbl);
  execute format(
    'create policy "triageve team" on public.%I for all to authenticated '
    'using (public.triageve_is_team()) with check (public.triageve_is_team())', tbl);
  execute format('revoke all on public.%I from anon', tbl);
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
  ) then
    execute format('alter publication supabase_realtime add table public.%I', tbl);
  end if;
end;
$$;

revoke execute on function public.triageve_secure(text) from public, anon, authenticated;

select public.triageve_secure('triageve_messages');
select public.triageve_secure('triageve_diary');
select public.triageve_secure('triageve_meetings');

create table if not exists public.triageve_checkins (
  id bigint generated always as identity primary key,
  author text not null,
  status text not null check (status in ('goed', 'matig', 'zorgelijk')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.triageve_measurements (
  id bigint generated always as identity primary key,
  author text not null,
  kind text not null check (kind in ('bloeddruk', 'gewicht', 'temperatuur', 'suiker', 'pijn', 'overig')),
  value text not null,
  note text,
  measured_at timestamptz not null default now()
);

select public.triageve_secure('triageve_checkins');
select public.triageve_secure('triageve_measurements');

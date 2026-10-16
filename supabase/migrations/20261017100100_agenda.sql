alter table public.triageve_meetings
  add column if not exists kind text not null default 'overleg'
    check (kind in ('overleg', 'afspraak', 'bezoek', 'overig')),
  add column if not exists location text;

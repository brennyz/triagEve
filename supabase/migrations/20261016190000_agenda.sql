-- Agenda: soort (overleg/afspraak/bezoek/overig) en locatie.
-- Bestaande rijen blijven 'overleg' via de default.

alter table public.triageve_meetings
  add column if not exists kind text not null default 'overleg',
  add column if not exists location text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'triageve_meetings_kind_check'
  ) then
    alter table public.triageve_meetings
      add constraint triageve_meetings_kind_check
      check (kind in ('overleg','afspraak','bezoek','overig'));
  end if;
end $$;

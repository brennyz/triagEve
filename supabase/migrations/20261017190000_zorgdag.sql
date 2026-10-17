-- Inname van vandaag, plus overdracht en wie er nu is.
-- Bestaande migraties blijven onaangeroerd.

alter table public.triageve_profile
  add column if not exists handover text,
  add column if not exists handover_by text,
  add column if not exists handover_at timestamptz,
  add column if not exists present_by text,
  add column if not exists present_since timestamptz;

create table if not exists public.triageve_doses (
  id bigint generated always as identity primary key,
  medication_id bigint not null references public.triageve_medications (id) on delete cascade,
  day date not null,
  slot text not null check (slot in ('ochtend', 'middag', 'avond', 'nacht')),
  author text not null,
  created_at timestamptz not null default now(),
  unique (medication_id, day, slot)
);

create index if not exists triageve_doses_day_idx on public.triageve_doses (day);

select public.triageve_secure('triageve_doses');

drop trigger if exists triageve_log on public.triageve_doses;
create trigger triageve_log
  after insert or update or delete on public.triageve_doses
  for each row execute function public.triageve_log();

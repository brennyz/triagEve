-- Medicatie-overzicht voor de familie (geen voorschrift).

create table if not exists public.triageve_medications (
  id bigint generated always as identity primary key,
  name text not null,
  dose text,
  schedule text,
  reason text,
  notes text,
  active boolean not null default true,
  started_on date,
  stopped_on date,
  updated_by text,
  updated_at timestamptz not null default now()
);

select public.triageve_secure('triageve_medications');

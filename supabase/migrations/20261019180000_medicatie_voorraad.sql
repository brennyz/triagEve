-- Voorraad en of een nieuw recept al geregeld is.
-- Geen echte medicatie of aantallen in dit bestand.

alter table public.triageve_medications
  add column if not exists stock_count integer,
  add column if not exists stock_date date,
  add column if not exists per_day numeric,
  add column if not exists warn_days integer default 7,
  add column if not exists refill_status text default 'geen',
  add column if not exists refill_status_at timestamptz,
  add column if not exists refill_status_by text;

alter table public.triageve_medications drop constraint if exists triageve_medications_refill_status_check;
alter table public.triageve_medications
  add constraint triageve_medications_refill_status_check
  check (refill_status is null or refill_status in ('geen', 'nog_niet_op', 'besteld'));

alter table public.triageve_medications drop constraint if exists triageve_medications_stock_count_check;
alter table public.triageve_medications
  add constraint triageve_medications_stock_count_check
  check (stock_count is null or stock_count >= 0);

alter table public.triageve_medications drop constraint if exists triageve_medications_per_day_check;
alter table public.triageve_medications
  add constraint triageve_medications_per_day_check
  check (per_day is null or per_day > 0);

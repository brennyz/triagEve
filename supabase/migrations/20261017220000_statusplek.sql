-- Waar de status is gezien, en waarmee Eef bezig was.
-- Leeg mag bij bezig-met. Waar hoort een korte keuze te zijn.

alter table public.triageve_checkins
  add column if not exists place text,
  add column if not exists activity text;

alter table public.triageve_checkins drop constraint if exists triageve_checkins_place_check;
alter table public.triageve_checkins
  add constraint triageve_checkins_place_check
  check (place is null or place in ('thuis', 'bed', 'tuin', 'onderweg', 'arts', 'anders'));

alter table public.triageve_checkins drop constraint if exists triageve_checkins_activity_check;
alter table public.triageve_checkins
  add constraint triageve_checkins_activity_check
  check (activity is null or activity in ('rusten', 'eten', 'bezoek', 'lopen', 'toilet', 'slapen'));

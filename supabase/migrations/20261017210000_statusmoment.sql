-- Status hoort bij een moment: nu, of een afspraak van vandaag.
-- Kenmerken zijn leeg als niemand ze invulde.

alter table public.triageve_checkins
  add column if not exists meeting_id bigint references public.triageve_meetings (id) on delete set null,
  add column if not exists sleep text,
  add column if not exists mood text,
  add column if not exists food text,
  add column if not exists pain text,
  add column if not exists clarity text;

alter table public.triageve_checkins drop constraint if exists triageve_checkins_sleep_check;
alter table public.triageve_checkins
  add constraint triageve_checkins_sleep_check
  check (sleep is null or sleep in ('goed', 'onrustig', 'slecht'));

alter table public.triageve_checkins drop constraint if exists triageve_checkins_mood_check;
alter table public.triageve_checkins
  add constraint triageve_checkins_mood_check
  check (mood is null or mood in ('rustig', 'somber', 'onrustig'));

alter table public.triageve_checkins drop constraint if exists triageve_checkins_food_check;
alter table public.triageve_checkins
  add constraint triageve_checkins_food_check
  check (food is null or food in ('goed', 'weinig', 'niet'));

alter table public.triageve_checkins drop constraint if exists triageve_checkins_pain_check;
alter table public.triageve_checkins
  add constraint triageve_checkins_pain_check
  check (pain is null or pain in ('geen', 'beetje', 'duidelijk'));

alter table public.triageve_checkins drop constraint if exists triageve_checkins_clarity_check;
alter table public.triageve_checkins
  add constraint triageve_checkins_clarity_check
  check (clarity is null or clarity in ('helder', 'verward', 'suf'));

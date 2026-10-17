-- Zorgverleners met praktijkgegevens, en onze drie contactpersonen.
-- Paps is hoofd, Jacky en Bren zijn secundair. Bestaande rijen blijven geldig.

alter table public.triageve_contacts
  add column if not exists organisation text,
  add column if not exists address text,
  add column if not exists hours text,
  add column if not exists circle text,
  add column if not exists rank text;

alter table public.triageve_contacts drop constraint if exists triageve_contacts_circle_check;
alter table public.triageve_contacts
  add constraint triageve_contacts_circle_check
  check (circle is null or circle in ('familie', 'zorg'));

alter table public.triageve_contacts drop constraint if exists triageve_contacts_rank_check;
alter table public.triageve_contacts
  add constraint triageve_contacts_rank_check
  check (rank is null or rank in ('hoofd', 'secundair'));

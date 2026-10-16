-- Wensen en regie van Eef (alleen tekst, geen documenten of BSN).

alter table public.triageve_profile
  add column if not exists wishes text,
  add column if not exists sharing text,
  add column if not exists representative text,
  add column if not exists documents text;

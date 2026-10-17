-- Waar Eef verblijft: thuis, Assen (opvang), of een zelf aangemaakte plek.
-- Bestaande migraties blijven onaangeroerd. Kolommen op een bestaande tabel.

alter table public.triageve_profile
  add column if not exists stay text,
  add column if not exists stay_by text,
  add column if not exists stay_at timestamptz,
  add column if not exists places text[];

alter table public.triageve_profile drop constraint if exists triageve_profile_stay_len;
alter table public.triageve_profile
  add constraint triageve_profile_stay_len
  check (stay is null or char_length(btrim(stay)) between 1 and 60);

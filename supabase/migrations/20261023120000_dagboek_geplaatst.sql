-- Wanneer een stukje in het dagboek is gezet, los van de tijd van het verhaal.
-- Een chatbericht houdt created_at van dat bericht. Home sorteert op inserted_at.

alter table public.triageve_diary
  add column if not exists inserted_at timestamptz;

update public.triageve_diary
  set inserted_at = created_at
  where inserted_at is null;

alter table public.triageve_diary
  alter column inserted_at set default now();

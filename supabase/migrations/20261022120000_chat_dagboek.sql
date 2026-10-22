-- Een chatbericht kan één keer in het dagboek komen, met de tijd van dat bericht.
-- Geen berichten of namen in dit bestand.

alter table public.triageve_diary
  add column if not exists source_message_id bigint,
  add column if not exists filed_by text;

create unique index if not exists triageve_diary_source_message
  on public.triageve_diary (source_message_id)
  where source_message_id is not null and deleted_at is null;

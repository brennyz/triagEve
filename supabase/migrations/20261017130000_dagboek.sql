-- Dagboek: categorie en belangrijk.

alter table public.triageve_diary
  add column if not exists category text not null default 'algemeen',
  add column if not exists important boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'triageve_diary_category_check'
  ) then
    alter table public.triageve_diary
      add constraint triageve_diary_category_check
      check (category in ('algemeen','gezondheid','stemming','eten','slaap','medicatie','incident'));
  end if;
end $$;

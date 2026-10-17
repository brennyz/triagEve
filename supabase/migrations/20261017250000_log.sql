-- De geschiedenis keek naar kolommen die niet op elke tabel staan (author, created_by).
-- Postgres stopt dan de hele opslag, en de app krijgt een 400. Alleen bestaande kolommen tellen.

create or replace function public.triageve_log() returns trigger
language plpgsql security definer as $$
declare
  who text;
  rowj jsonb;
begin
  if tg_table_name = 'triageve_messages' and tg_op = 'INSERT' then
    return new;
  end if;
  rowj := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  who := coalesce(
    rowj->>'updated_by',
    rowj->>'author',
    rowj->>'created_by',
    rowj->>'done_by',
    rowj->>'stay_by'
  );
  insert into public.triageve_history (table_name, row_id, action, old_data, new_data, changed_by)
  values (
    tg_table_name,
    (rowj->>'id')::bigint,
    lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    who
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';

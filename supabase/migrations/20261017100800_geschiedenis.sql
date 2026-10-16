alter table public.triageve_diary add column if not exists deleted_at timestamptz;
alter table public.triageve_meetings add column if not exists deleted_at timestamptz;
alter table public.triageve_contacts add column if not exists deleted_at timestamptz;
alter table public.triageve_medications add column if not exists deleted_at timestamptz;
alter table public.triageve_tasks add column if not exists deleted_at timestamptz;

create table if not exists public.triageve_history (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by text,
  changed_at timestamptz not null default now()
);

select public.triageve_secure('triageve_history');

create or replace function public.triageve_log_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  newj jsonb;
  oldj jsonb;
  who text;
begin
  if tg_table_name in ('triageve_history', 'triageve_push_subscriptions') then
    return coalesce(new, old);
  end if;
  if tg_table_name = 'triageve_messages' and tg_op = 'INSERT' then
    return new;
  end if;

  newj := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  oldj := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  who := coalesce(
    newj->>'updated_by', newj->>'author', newj->>'created_by', newj->>'done_by', newj->>'person',
    oldj->>'updated_by', oldj->>'author', oldj->>'created_by', oldj->>'done_by', oldj->>'person'
  );

  insert into public.triageve_history (table_name, row_id, action, old_data, new_data, changed_by)
  values (tg_table_name, coalesce(newj->>'id', oldj->>'id'), tg_op, oldj, newj, who);

  return coalesce(new, old);
end;
$$;

revoke all on function public.triageve_log_change() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'triageve_messages', 'triageve_diary', 'triageve_meetings', 'triageve_profile',
    'triageve_contacts', 'triageve_medications', 'triageve_tasks',
    'triageve_checkins', 'triageve_measurements'
  ]
  loop
    execute format('drop trigger if exists triageve_history on public.%I', t);
    execute format(
      'create trigger triageve_history after insert or update or delete on public.%I '
      'for each row execute function public.triageve_log_change()', t);
  end loop;
end $$;

create or replace function public.triageve_purge_deleted()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.triageve_diary where deleted_at < now() - interval '30 days';
  delete from public.triageve_meetings where deleted_at < now() - interval '30 days';
  delete from public.triageve_contacts where deleted_at < now() - interval '30 days';
  delete from public.triageve_medications where deleted_at < now() - interval '30 days';
  delete from public.triageve_tasks where deleted_at < now() - interval '30 days';
end;
$$;

revoke all on function public.triageve_purge_deleted() from public, anon, authenticated;
grant execute on function public.triageve_purge_deleted() to service_role;

-- Geschiedenis, zachte prullenbak (30 dagen) en wie-deed-wat.

create table if not exists public.triageve_history (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id bigint not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by text,
  changed_at timestamptz not null default now()
);

select public.triageve_secure('triageve_history');

alter table public.triageve_diary add column if not exists deleted_at timestamptz;
alter table public.triageve_meetings add column if not exists deleted_at timestamptz;
alter table public.triageve_contacts add column if not exists deleted_at timestamptz;
alter table public.triageve_medications add column if not exists deleted_at timestamptz;
alter table public.triageve_tasks add column if not exists deleted_at timestamptz;

create or replace function public.triageve_log() returns trigger
language plpgsql security definer as $$
declare
  who text;
begin
  if tg_table_name = 'triageve_messages' and tg_op = 'INSERT' then
    return new;
  end if;
  who := coalesce(
    case when tg_op <> 'DELETE' then new.updated_by end,
    case when tg_op <> 'DELETE' then new.author end,
    case when tg_op <> 'DELETE' then new.created_by end,
    old.updated_by, old.author, old.created_by, old.done_by
  );
  insert into public.triageve_history (table_name, row_id, action, old_data, new_data, changed_by)
  values (
    tg_table_name,
    coalesce(new.id, old.id)::bigint,
    lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    who
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'triageve_messages','triageve_diary','triageve_meetings','triageve_profile',
    'triageve_contacts','triageve_medications','triageve_tasks',
    'triageve_checkins','triageve_measurements'
  ]
  loop
    execute format('drop trigger if exists triageve_log on public.%I', t);
    execute format(
      'create trigger triageve_log after insert or update or delete on public.%I
       for each row execute function public.triageve_log()', t);
  end loop;
end $$;

-- De getoonde naam is Ronald. Oude rijen heetten Paps.
-- Eerst de check weg, anders weigert de database de nieuwe naam.

do $$
declare cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'triageve_tasks'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%assignee%';
  if cname is not null then
    execute format('alter table public.triageve_tasks drop constraint %I', cname);
  end if;
end $$;

update public.triageve_tasks set assignee = 'Ronald' where assignee = 'Paps';
update public.triageve_tasks set created_by = 'Ronald' where created_by = 'Paps';
update public.triageve_tasks set done_by = 'Ronald' where done_by = 'Paps';

alter table public.triageve_tasks
  add constraint triageve_tasks_assignee_check
  check (assignee in ('Jacky', 'Ronald', 'Bren'));

update public.triageve_messages set author = 'Ronald' where author = 'Paps';
update public.triageve_diary set author = 'Ronald' where author = 'Paps';
update public.triageve_meetings set created_by = 'Ronald' where created_by = 'Paps';
update public.triageve_meetings set updated_by = 'Ronald' where updated_by = 'Paps';
update public.triageve_meetings set who = array_replace(who, 'Paps', 'Ronald') where 'Paps' = any(who);
update public.triageve_contacts set name = 'Ronald' where name = 'Paps';
update public.triageve_contacts set updated_by = 'Ronald' where updated_by = 'Paps';
update public.triageve_profile set updated_by = 'Ronald' where updated_by = 'Paps';
update public.triageve_profile set present_by = 'Ronald' where present_by = 'Paps';
update public.triageve_profile set handover_by = 'Ronald' where handover_by = 'Paps';
update public.triageve_profile set stay_by = 'Ronald' where stay_by = 'Paps';
update public.triageve_doses set author = 'Ronald' where author = 'Paps';
update public.triageve_checkins set author = 'Ronald' where author = 'Paps';
update public.triageve_measurements set author = 'Ronald' where author = 'Paps';
update public.triageve_medications set updated_by = 'Ronald' where updated_by = 'Paps';
update public.triageve_history set changed_by = 'Ronald' where changed_by = 'Paps';
update public.triageve_push_subscriptions set person = 'Ronald' where person = 'Paps';

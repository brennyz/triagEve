-- Rechten voor het ingelogde team-account. Nieuwe Supabase-projecten geven
-- authenticated geen tabelrechten meer. anon blijft buiten (geen policy, geen grant).

create or replace function public.triageve_is_team()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'team@triageve.app'
$$;

create or replace function public.triageve_secure(tbl text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('alter table public.%I enable row level security', tbl);
  execute format('drop policy if exists "triageve team" on public.%I', tbl);
  execute format(
    'create policy "triageve team" on public.%I for all to authenticated '
    'using (public.triageve_is_team()) with check (public.triageve_is_team())', tbl);
  execute format('revoke all on public.%I from public, anon', tbl);
  execute format(
    'grant select, insert, update, delete on public.%I to authenticated, service_role', tbl);
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
     ) then
    execute format('alter publication supabase_realtime add table public.%I', tbl);
  end if;
end;
$$;

revoke all on function public.triageve_secure(text) from public, anon, authenticated;
revoke all on function public.triageve_is_team() from public, anon;
grant execute on function public.triageve_is_team() to authenticated, service_role;

grant usage on schema public to authenticated;

select public.triageve_secure('triageve_messages');
select public.triageve_secure('triageve_diary');
select public.triageve_secure('triageve_meetings');

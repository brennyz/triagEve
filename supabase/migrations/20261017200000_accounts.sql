-- Drie eigen accounts. Het oude gedeelde adres heeft daarna geen toegang meer.
-- Bestaande migraties blijven onaangeroerd. Policies blijven triageve_is_team() aanroepen.

create or replace function public.triageve_is_team()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'jacky@triageve.app',
    'paps@triageve.app',
    'bren@triageve.app'
  )
$$;

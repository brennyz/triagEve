create table if not exists public.triageve_profile (
  id int primary key default 1 check (id = 1),
  summary text,
  important text,
  emergency text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.triageve_contacts (
  id bigint generated always as identity primary key,
  name text not null,
  role text,
  phone text,
  email text,
  notes text,
  is_emergency boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now()
);

select public.triageve_secure('triageve_profile');
select public.triageve_secure('triageve_contacts');

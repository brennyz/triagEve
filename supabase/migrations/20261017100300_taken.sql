create table if not exists public.triageve_tasks (
  id bigint generated always as identity primary key,
  title text not null,
  assignee text check (assignee in ('Jacky', 'Paps', 'Bren')),
  due_date date,
  done boolean not null default false,
  done_by text,
  done_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

select public.triageve_secure('triageve_tasks');

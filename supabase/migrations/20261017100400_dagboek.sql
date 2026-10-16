alter table public.triageve_diary
  add column if not exists category text not null default 'algemeen'
    check (category in ('algemeen', 'gezondheid', 'stemming', 'eten', 'slaap', 'medicatie', 'incident')),
  add column if not exists important boolean not null default false;

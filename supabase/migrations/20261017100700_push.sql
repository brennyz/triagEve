create table if not exists public.triageve_push_subscriptions (
  id bigint generated always as identity primary key,
  person text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

select public.triageve_secure('triageve_push_subscriptions');

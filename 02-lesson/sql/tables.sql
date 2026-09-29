create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  chat_id bigint not null,
  username text,
  first_name text,
  last_name text,
  last_message_at timestamptz,
  last_client_message_at timestamptz,
  last_bot_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  telegram_update_id bigint,
  telegram_message_id bigint,
  direction text not null check (direction in ('client', 'bot')),
  text text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clients_last_message_at_idx
  on public.clients (last_message_at desc nulls last);

create index if not exists messages_created_at_idx
  on public.messages (created_at desc);

create index if not exists messages_client_id_idx
  on public.messages (client_id);

alter table public.clients enable row level security;
alter table public.messages enable row level security;

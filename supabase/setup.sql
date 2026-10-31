-- EloScout shared application data. Run once in Supabase SQL Editor.
create table if not exists public.app_state (
  id smallint primary key check (id = 1),
  fixtures jsonb not null default '[]'::jsonb,
  results jsonb not null default '[]'::jsonb,
  forecasts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
revoke all on table public.app_state from anon, authenticated;
grant select, insert, update on table public.app_state to service_role;

insert into public.app_state (id)
values (1)
on conflict (id) do nothing;

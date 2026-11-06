alter table public.services_settings
  add column if not exists group_order jsonb not null default '[]'::jsonb;

create table if not exists public.projects_settings (
  id text primary key default 'default',
  group_order jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.projects_settings (id) values ('default')
on conflict (id) do nothing;

alter table public.projects_settings enable row level security;

grant all on public.projects_settings to service_role;

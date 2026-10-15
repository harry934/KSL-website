-- Events and services content tables

create table if not exists public.event_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  theme text,
  event_date date not null,
  time_start text,
  time_end text,
  timezone text not null default 'Africa/Nairobi',
  venue text,
  description text,
  summary text,
  image_path text,
  body_html text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

create table if not exists public.services_settings (
  id text primary key default 'default',
  intro text,
  download_catalog jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.services_settings (id, intro) values ('default', '')
on conflict (id) do nothing;

create table if not exists public.service_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text,
  title text not null,
  excerpt text,
  detail text,
  image_path text,
  downloads jsonb not null default '[]'::jsonb,
  source_popup_id text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

alter table public.event_items enable row level security;
alter table public.services_settings enable row level security;
alter table public.service_items enable row level security;

create policy "events_public_read" on public.event_items
  for select to anon, authenticated
  using (status = 'published');

create policy "services_settings_public_read" on public.services_settings
  for select to anon, authenticated
  using (true);

create policy "service_items_public_read" on public.service_items
  for select to anon, authenticated
  using (status = 'published');

create trigger event_items_updated before update on public.event_items
  for each row execute function public.set_updated_at();

create trigger services_settings_updated before update on public.services_settings
  for each row execute function public.set_updated_at();

create trigger service_items_updated before update on public.service_items
  for each row execute function public.set_updated_at();

grant all on public.event_items to service_role;
grant all on public.services_settings to service_role;
grant all on public.service_items to service_role;

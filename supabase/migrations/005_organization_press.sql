-- Organization structure and press kit

create table if not exists public.organization_settings (
  id text primary key default 'default',
  chart_download_id text,
  updated_at timestamptz not null default now()
);

insert into public.organization_settings (id) values ('default')
on conflict (id) do nothing;

create table if not exists public.organization_leadership (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  summary text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

create table if not exists public.organization_yards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lead text,
  summary text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

create table if not exists public.press_settings (
  id text primary key default 'default',
  boilerplate text,
  contact_email text,
  contact_phone text,
  updated_at timestamptz not null default now()
);

insert into public.press_settings (id) values ('default')
on conflict (id) do nothing;

create table if not exists public.press_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  href text,
  download_id text,
  asset_type text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

alter table public.organization_settings enable row level security;
alter table public.organization_leadership enable row level security;
alter table public.organization_yards enable row level security;
alter table public.press_settings enable row level security;
alter table public.press_assets enable row level security;

create policy "organization_settings_public_read" on public.organization_settings
  for select to anon, authenticated using (true);

create policy "organization_leadership_public_read" on public.organization_leadership
  for select to anon, authenticated using (status = 'published');

create policy "organization_yards_public_read" on public.organization_yards
  for select to anon, authenticated using (status = 'published');

create policy "press_settings_public_read" on public.press_settings
  for select to anon, authenticated using (true);

create policy "press_assets_public_read" on public.press_assets
  for select to anon, authenticated using (status = 'published');

create trigger organization_settings_updated before update on public.organization_settings
  for each row execute function public.set_updated_at();

create trigger organization_leadership_updated before update on public.organization_leadership
  for each row execute function public.set_updated_at();

create trigger organization_yards_updated before update on public.organization_yards
  for each row execute function public.set_updated_at();

create trigger press_settings_updated before update on public.press_settings
  for each row execute function public.set_updated_at();

create trigger press_assets_updated before update on public.press_assets
  for each row execute function public.set_updated_at();

grant all on public.organization_settings to service_role;
grant all on public.organization_leadership to service_role;
grant all on public.organization_yards to service_role;
grant all on public.press_settings to service_role;
grant all on public.press_assets to service_role;

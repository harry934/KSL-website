-- Products, CSR programmes, site-wide settings, dashboard counts

create table if not exists public.products_settings (
  id text primary key default 'default',
  kicker text,
  title text,
  intro text,
  catalogue_url text,
  range_kicker text,
  range_title text,
  range_groups jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.products_settings (id) values ('default')
on conflict (id) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null default 'other',
  category_label text,
  eyebrow text,
  image_path text,
  image_alt text,
  key_specs jsonb not null default '[]'::jsonb,
  extra_specs jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

create table if not exists public.csr_settings (
  id text primary key default 'default',
  kicker text,
  title text,
  tagline text,
  intro text,
  badges jsonb not null default '[]'::jsonb,
  hero_images jsonb not null default '[]'::jsonb,
  stats jsonb not null default '[]'::jsonb,
  footnote text,
  programmes_title text,
  programmes_intro text,
  updated_at timestamptz not null default now()
);

insert into public.csr_settings (id) values ('default')
on conflict (id) do nothing;

create table if not exists public.csr_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  image_path text,
  image_alt text,
  location text,
  event_date date,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  status text not null default 'published' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

alter table public.products_settings enable row level security;
alter table public.products enable row level security;
alter table public.csr_settings enable row level security;
alter table public.csr_projects enable row level security;
alter table public.site_settings enable row level security;

create policy "products_settings_public_read" on public.products_settings
  for select to anon, authenticated using (true);
create policy "products_public_read" on public.products
  for select to anon, authenticated using (status = 'published');
create policy "csr_settings_public_read" on public.csr_settings
  for select to anon, authenticated using (true);
create policy "csr_projects_public_read" on public.csr_projects
  for select to anon, authenticated using (status = 'published');
create policy "site_settings_public_read" on public.site_settings
  for select to anon, authenticated using (status = 'published');

create trigger products_settings_updated before update on public.products_settings
  for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger csr_settings_updated before update on public.csr_settings
  for each row execute function public.set_updated_at();
create trigger csr_projects_updated before update on public.csr_projects
  for each row execute function public.set_updated_at();
create trigger site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

grant all on public.products_settings, public.products, public.csr_settings,
  public.csr_projects, public.site_settings to service_role;

-- One round trip for the dashboard KPI grid.
create or replace function public.portal_content_counts()
returns table (module_key text, published bigint, draft bigint)
language sql
stable
security definer
set search_path = public
as $$
  select 'news', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from news_items
  union all select 'events', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from event_items
  union all select 'gallery', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from gallery_photos
  union all select 'services', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from service_items
  union all select 'products', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from products
  union all select 'careers', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from career_listings
  union all select 'faq', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from faq_items
  union all select 'csr', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from csr_projects
  union all select 'downloads', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from download_items
  union all select 'organization', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from organization_leadership
  union all select 'press', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from press_assets
  union all select 'site_settings', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from site_settings
  union all select 'staff', count(*) filter (where is_active), count(*) filter (where not is_active) from admin_profiles
$$;

revoke all on function public.portal_content_counts() from public, anon, authenticated;
grant execute on function public.portal_content_counts() to service_role;

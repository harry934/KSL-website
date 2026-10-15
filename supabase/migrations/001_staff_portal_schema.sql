-- KSL Staff Portal — run once in Supabase SQL Editor (Dashboard → SQL → New query)

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Admin profiles (linked to auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  is_super_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.admin_profiles (id),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content modules (permission scopes)
-- ---------------------------------------------------------------------------
create table if not exists public.content_modules (
  key text primary key,
  label text not null,
  sort_order int not null default 0
);

insert into public.content_modules (key, label, sort_order) values
  ('news', 'News', 10),
  ('events', 'Events', 20),
  ('gallery', 'Gallery', 30),
  ('services', 'Services', 40),
  ('products', 'Products', 50),
  ('careers', 'Careers', 60),
  ('faq', 'FAQ', 70),
  ('csr', 'CSR', 80),
  ('downloads', 'Downloads', 90),
  ('organization', 'Organization', 100),
  ('press', 'Press', 110),
  ('site_settings', 'Site settings', 120),
  ('staff', 'Staff management', 1000)
on conflict (key) do nothing;

create table if not exists public.admin_module_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.admin_profiles (id) on delete cascade,
  module_key text not null references public.content_modules (key) on delete cascade,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  can_publish boolean not null default false,
  can_delete boolean not null default false,
  unique (profile_id, module_key)
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.admin_profiles (id),
  module_key text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FAQ (first editable module)
-- ---------------------------------------------------------------------------
create table if not exists public.faq_groups (
  id text primary key,
  title text not null,
  sort_order int not null default 0,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.faq_groups (id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

-- ---------------------------------------------------------------------------
-- News (structure for later modules)
-- ---------------------------------------------------------------------------
create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  category text,
  published_date date,
  image_path text,
  author text,
  location text,
  body_html text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

-- ---------------------------------------------------------------------------
-- RLS: deny direct client writes; staff app uses service role on server
-- ---------------------------------------------------------------------------
alter table public.admin_profiles enable row level security;
alter table public.admin_module_permissions enable row level security;
alter table public.activity_log enable row level security;
alter table public.faq_groups enable row level security;
alter table public.faq_items enable row level security;
alter table public.news_items enable row level security;

-- Authenticated users can read their own profile
create policy "profiles_read_own" on public.admin_profiles
  for select to authenticated
  using (id = auth.uid() and is_active = true);

-- Public read published FAQ (for future API / anon)
create policy "faq_groups_public_read" on public.faq_groups
  for select to anon, authenticated
  using (status = 'published');

create policy "faq_items_public_read" on public.faq_items
  for select to anon, authenticated
  using (status = 'published');

create policy "news_public_read" on public.news_items
  for select to anon, authenticated
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- Storage buckets (run in Dashboard → Storage if SQL fails)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media-public', 'media-public', true),
       ('downloads', 'downloads', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger admin_profiles_updated before update on public.admin_profiles
  for each row execute function public.set_updated_at();

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;

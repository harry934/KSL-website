-- Careers and corporate downloads

create table if not exists public.careers_settings (
  id text primary key default 'default',
  apply_email text not null default 'careers@kenyashipyards.co.ke',
  apply_note text,
  updated_at timestamptz not null default now()
);

insert into public.careers_settings (id) values ('default')
on conflict (id) do nothing;

create table if not exists public.career_listings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('vacancy', 'internship')),
  title text not null,
  location text,
  summary text,
  closing_date date,
  apply_url text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

create table if not exists public.downloads_settings (
  id text primary key default 'default',
  base_url text,
  updated_at timestamptz not null default now()
);

insert into public.downloads_settings (id) values ('default')
on conflict (id) do nothing;

create table if not exists public.download_items (
  id text primary key,
  title text not null,
  subtitle text,
  category text not null,
  category_label text not null,
  language text,
  doc_date text,
  file_type text,
  file_name text,
  anchor text,
  alias_of text,
  external_href text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

alter table public.careers_settings enable row level security;
alter table public.career_listings enable row level security;
alter table public.downloads_settings enable row level security;
alter table public.download_items enable row level security;

create policy "careers_settings_public_read" on public.careers_settings
  for select to anon, authenticated using (true);

create policy "career_listings_public_read" on public.career_listings
  for select to anon, authenticated using (status = 'published');

create policy "downloads_settings_public_read" on public.downloads_settings
  for select to anon, authenticated using (true);

create policy "download_items_public_read" on public.download_items
  for select to anon, authenticated using (status = 'published');

create trigger careers_settings_updated before update on public.careers_settings
  for each row execute function public.set_updated_at();

create trigger career_listings_updated before update on public.career_listings
  for each row execute function public.set_updated_at();

create trigger downloads_settings_updated before update on public.downloads_settings
  for each row execute function public.set_updated_at();

create trigger download_items_updated before update on public.download_items
  for each row execute function public.set_updated_at();

grant all on public.careers_settings to service_role;
grant all on public.career_listings to service_role;
grant all on public.downloads_settings to service_role;
grant all on public.download_items to service_role;

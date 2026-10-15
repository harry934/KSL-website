-- Applied via Supabase MCP; keep in repo for reference.
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  title text,
  category text default 'all',
  tags text[] default '{}',
  storage_path text,
  public_url text,
  sort_order int not null default 0,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

alter table public.gallery_photos enable row level security;

create policy "gallery_public_read" on public.gallery_photos
  for select to anon, authenticated
  using (status = 'published');

grant all on public.gallery_photos to service_role;

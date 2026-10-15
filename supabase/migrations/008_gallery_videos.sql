-- YouTube videos on the public Gallery page and home page

create table if not exists public.gallery_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  title text not null default '',
  caption text,
  featured boolean not null default false,
  sort_order int not null default 0,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

alter table public.gallery_videos enable row level security;

create policy "gallery_videos_public_read" on public.gallery_videos
  for select to anon, authenticated using (status = 'published');

create trigger gallery_videos_updated before update on public.gallery_videos
  for each row execute function public.set_updated_at();

grant all on public.gallery_videos to service_role;

create or replace function public.portal_content_counts()
returns table (module_key text, published bigint, draft bigint)
language sql
stable
security definer
set search_path = public
as $$
  select 'news', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from news_items
  union all select 'events', count(*) filter (where status = 'published'), count(*) filter (where status = 'draft') from event_items
  union all select 'gallery',
    (select count(*) from gallery_photos where status = 'published') + (select count(*) from gallery_videos where status = 'published'),
    (select count(*) from gallery_photos where status = 'draft') + (select count(*) from gallery_videos where status = 'draft')
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

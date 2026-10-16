-- Messages is a portal section, so it can be granted like the other modules.

insert into public.content_modules (key, label, sort_order)
values ('messages', 'Messages', 115)
on conflict (key) do nothing;

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
  union all select 'messages',
    count(*) filter (where read_at is null),
    count(*) filter (where read_at is not null)
    from website_messages
  union all select 'staff', count(*) filter (where is_active), count(*) filter (where not is_active) from admin_profiles
$$;

revoke all on function public.portal_content_counts() from public, anon, authenticated;
grant execute on function public.portal_content_counts() to service_role;

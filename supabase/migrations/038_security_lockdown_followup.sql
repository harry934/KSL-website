-- Completes migration 016 posture on live projects and tightens anon read policies.
-- Idempotent: safe to re-run.

-- Note: ALTER DEFAULT PRIVILEGES for postgres/supabase_admin may require the
-- dashboard SQL editor if the migration role lacks permission. Table/sequence
-- revokes below are the live lockdown.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter table public.content_modules enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set file_size_limit = greatest(coalesce(file_size_limit, 0), 8388608),
    allowed_mime_types = coalesce(
      allowed_mime_types,
      array['image/jpeg', 'image/png', 'image/webp']
    )
where id = 'media-public';

update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'downloads';

-- Align anon/authenticated published reads with portal filters (no soft-deleted / future go-live rows).
drop policy if exists news_public_read on public.news_items;
create policy news_public_read on public.news_items
  for select to anon, authenticated
  using (
    status = 'published'
    and deleted_at is null
    and (go_live_on is null or go_live_on <= current_date)
  );

drop policy if exists events_public_read on public.event_items;
create policy events_public_read on public.event_items
  for select to anon, authenticated
  using (
    status = 'published'
    and deleted_at is null
    and (go_live_on is null or go_live_on <= current_date)
  );

drop policy if exists faq_groups_public_read on public.faq_groups;
create policy faq_groups_public_read on public.faq_groups
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists faq_items_public_read on public.faq_items;
create policy faq_items_public_read on public.faq_items
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists gallery_public_read on public.gallery_photos;
create policy gallery_public_read on public.gallery_photos
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists gallery_videos_public_read on public.gallery_videos;
create policy gallery_videos_public_read on public.gallery_videos
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists service_items_public_read on public.service_items;
create policy service_items_public_read on public.service_items
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists career_listings_public_read on public.career_listings;
create policy career_listings_public_read on public.career_listings
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists download_items_public_read on public.download_items;
create policy download_items_public_read on public.download_items
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists csr_projects_public_read on public.csr_projects;
create policy csr_projects_public_read on public.csr_projects
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists press_assets_public_read on public.press_assets;
create policy press_assets_public_read on public.press_assets
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists organization_leadership_public_read on public.organization_leadership;
create policy organization_leadership_public_read on public.organization_leadership
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists organization_board_public_read on public.organization_board_members;
create policy organization_board_public_read on public.organization_board_members
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null);

drop policy if exists organization_yards_public_read on public.organization_yards;
create policy organization_yards_public_read on public.organization_yards
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (status = 'published');

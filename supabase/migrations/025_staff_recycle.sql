-- Deleted staff accounts stay in the recycle bin until they are removed there.

alter table public.admin_profiles add column if not exists deleted_at timestamptz;

-- Content rows keep their history when an account is deleted for good.
alter table public.activity_log drop constraint if exists activity_log_actor_id_fkey;
alter table public.activity_log
  add constraint activity_log_actor_id_fkey
  foreign key (actor_id) references public.admin_profiles (id) on delete set null;

alter table public.admin_profiles drop constraint if exists admin_profiles_created_by_fkey;
alter table public.admin_profiles
  add constraint admin_profiles_created_by_fkey
  foreign key (created_by) references public.admin_profiles (id) on delete set null;

alter table public.career_listings drop constraint if exists career_listings_updated_by_fkey;
alter table public.career_listings
  add constraint career_listings_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.csr_projects drop constraint if exists csr_projects_updated_by_fkey;
alter table public.csr_projects
  add constraint csr_projects_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.download_items drop constraint if exists download_items_updated_by_fkey;
alter table public.download_items
  add constraint download_items_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.event_items drop constraint if exists event_items_updated_by_fkey;
alter table public.event_items
  add constraint event_items_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.faq_groups drop constraint if exists faq_groups_updated_by_fkey;
alter table public.faq_groups
  add constraint faq_groups_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.faq_items drop constraint if exists faq_items_updated_by_fkey;
alter table public.faq_items
  add constraint faq_items_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.gallery_photos drop constraint if exists gallery_photos_updated_by_fkey;
alter table public.gallery_photos
  add constraint gallery_photos_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.gallery_videos drop constraint if exists gallery_videos_updated_by_fkey;
alter table public.gallery_videos
  add constraint gallery_videos_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.news_items drop constraint if exists news_items_updated_by_fkey;
alter table public.news_items
  add constraint news_items_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.organization_board_members drop constraint if exists organization_board_members_updated_by_fkey;
alter table public.organization_board_members
  add constraint organization_board_members_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.organization_leadership drop constraint if exists organization_leadership_updated_by_fkey;
alter table public.organization_leadership
  add constraint organization_leadership_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.organization_yards drop constraint if exists organization_yards_updated_by_fkey;
alter table public.organization_yards
  add constraint organization_yards_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.press_assets drop constraint if exists press_assets_updated_by_fkey;
alter table public.press_assets
  add constraint press_assets_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.products drop constraint if exists products_updated_by_fkey;
alter table public.products
  add constraint products_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.projects drop constraint if exists projects_updated_by_fkey;
alter table public.projects
  add constraint projects_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.service_items drop constraint if exists service_items_updated_by_fkey;
alter table public.service_items
  add constraint service_items_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.site_image_overrides drop constraint if exists site_image_overrides_updated_by_fkey;
alter table public.site_image_overrides
  add constraint site_image_overrides_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

alter table public.site_settings drop constraint if exists site_settings_updated_by_fkey;
alter table public.site_settings
  add constraint site_settings_updated_by_fkey
  foreign key (updated_by) references public.admin_profiles (id) on delete set null;

create or replace function public.auth_email_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email
  from public.admin_profiles p
  join auth.users u on u.id = p.id
  where p.username = lower(trim(p_username))
    and p.is_active
    and p.deleted_at is null
  limit 1
$$;

revoke all on function public.auth_email_for_username(text) from public, anon, authenticated;
grant execute on function public.auth_email_for_username(text) to service_role;

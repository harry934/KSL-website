-- Items stay in the recycle bin until a staff member deletes them there.

alter table public.gallery_photos add column if not exists deleted_at timestamptz;
alter table public.gallery_videos add column if not exists deleted_at timestamptz;
alter table public.products add column if not exists deleted_at timestamptz;
alter table public.projects add column if not exists deleted_at timestamptz;
alter table public.career_listings add column if not exists deleted_at timestamptz;
alter table public.csr_projects add column if not exists deleted_at timestamptz;
alter table public.press_assets add column if not exists deleted_at timestamptz;
alter table public.service_items add column if not exists deleted_at timestamptz;
alter table public.faq_groups add column if not exists deleted_at timestamptz;
alter table public.faq_items add column if not exists deleted_at timestamptz;
alter table public.organization_leadership add column if not exists deleted_at timestamptz;
alter table public.organization_board_members add column if not exists deleted_at timestamptz;
alter table public.website_messages add column if not exists deleted_at timestamptz;

-- Soft delete, photo descriptions, tender expiry, event scheduling, and status history.

alter table public.news_items
  add column if not exists deleted_at timestamptz,
  add column if not exists image_alt text;

alter table public.event_items
  add column if not exists deleted_at timestamptz,
  add column if not exists image_alt text,
  add column if not exists go_live_on date;

alter table public.download_items
  add column if not exists deleted_at timestamptz,
  add column if not exists expires_on date,
  add column if not exists file_bytes bigint;

alter table public.gallery_photos
  add column if not exists alt_text text;

comment on column public.news_items.deleted_at is
  'Set when an editor removes the row. Restorable for 14 days, then deleted.';
comment on column public.download_items.expires_on is
  'The document leaves the public downloads page on this date.';

create table if not exists public.service_status_log (
  id bigint generated always as identity primary key,
  service text not null,
  state text not null,
  latency_ms integer not null,
  checked_at timestamptz not null default now()
);

create index if not exists service_status_log_checked_at_idx
  on public.service_status_log (checked_at desc);

alter table public.service_status_log enable row level security;
revoke all on table public.service_status_log from anon, authenticated;

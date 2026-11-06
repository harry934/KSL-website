-- Usernames stay unique. Length is 1–10 characters, not 3–32.
alter table public.admin_profiles drop constraint if exists admin_profiles_username_format;
alter table public.admin_profiles add constraint admin_profiles_username_format
  check (username ~ '^[a-z0-9][a-z0-9._-]{0,9}$');

alter table public.staff_account_requests drop constraint if exists staff_account_requests_username_shape;
alter table public.staff_account_requests add constraint staff_account_requests_username_shape
  check (
    requested_username is null or requested_username ~ '^[a-z0-9][a-z0-9._-]{0,9}$'
  );

-- Changes saved by someone who cannot publish, waiting for a publisher to check.
create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  entity_table text not null,
  entity_id text,
  entity_key text not null default '',
  title text not null default '',
  payload jsonb not null,
  submitted_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_drafts_entity_uidx
  on public.content_drafts (entity_table, entity_id)
  where entity_id is not null;

create unique index if not exists content_drafts_key_uidx
  on public.content_drafts (entity_table, entity_key)
  where entity_id is null;

alter table public.content_drafts enable row level security;
grant all on public.content_drafts to service_role;
revoke all on public.content_drafts from anon, authenticated;

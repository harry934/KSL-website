-- A publisher's note when work is sent back to the person who saved it.
create table if not exists public.draft_returns (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  entity_table text not null,
  entity_id text,
  entity_key text not null default '',
  title text not null default '',
  note text not null,
  author_id uuid references public.admin_profiles (id) on delete set null,
  reviewer_id uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint draft_returns_note_length check (char_length(note) between 1 and 300)
);

create unique index if not exists draft_returns_open_entity
  on public.draft_returns (entity_table, entity_id)
  where resolved_at is null and entity_id is not null;

create unique index if not exists draft_returns_open_key
  on public.draft_returns (entity_table, entity_key)
  where resolved_at is null and entity_id is null;

alter table public.draft_returns enable row level security;
grant all on public.draft_returns to service_role;
revoke all on public.draft_returns from anon, authenticated;

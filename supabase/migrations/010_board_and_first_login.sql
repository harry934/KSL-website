-- Board members added from the portal, and a first-sign-in username change.

alter table public.admin_profiles
  add column if not exists must_change_username boolean not null default false;

create table if not exists public.organization_board_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,
  board_group text not null default 'independent' check (board_group in ('defence', 'ps', 'independent')),
  summary text,
  photo_url text,
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

alter table public.organization_board_members enable row level security;

drop policy if exists "organization_board_public_read" on public.organization_board_members;
create policy "organization_board_public_read" on public.organization_board_members
  for select to anon, authenticated using (status = 'published');

drop trigger if exists organization_board_updated on public.organization_board_members;
create trigger organization_board_updated before update on public.organization_board_members
  for each row execute function public.set_updated_at();

grant all on public.organization_board_members to service_role;

-- Messages sent from the public contact form.
create table if not exists public.website_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  other_name text,
  surname text not null,
  email text not null,
  subject text not null,
  message text not null,
  preferred_contact text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.website_messages enable row level security;
grant all on public.website_messages to service_role;

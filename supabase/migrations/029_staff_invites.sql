-- Staff invites: numeric one-time passcode + signup link (create account or reset password).

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  passcode_hash text not null,
  kind text not null check (kind in ('create', 'password_reset')),
  contact_email text,
  phone text,
  is_super_admin boolean not null default false,
  role_title text,
  permissions jsonb not null default '[]'::jsonb,
  target_profile_id uuid references public.admin_profiles (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint staff_invites_contact check (contact_email is not null or phone is not null),
  constraint staff_invites_kind_target check (
    (kind = 'create' and target_profile_id is null)
    or (kind = 'password_reset' and target_profile_id is not null)
  )
);

create index if not exists staff_invites_token_idx on public.staff_invites (token);
create index if not exists staff_invites_open_idx on public.staff_invites (kind, expires_at)
  where used_at is null;

alter table public.staff_invites enable row level security;

revoke all on table public.staff_invites from anon, authenticated;

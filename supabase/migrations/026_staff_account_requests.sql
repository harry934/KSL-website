-- Requests from staff: a new username, or a new password when they cannot sign in.

create table if not exists public.staff_account_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_profiles (id) on delete cascade,
  kind text not null check (kind in ('username', 'password')),
  requested_username text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.admin_profiles (id) on delete set null,
  constraint staff_account_requests_username_shape check (
    requested_username is null or requested_username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'
  ),
  constraint staff_account_requests_kind_fields check (
    (kind = 'username' and requested_username is not null)
    or (kind = 'password' and requested_username is null)
  )
);

create unique index if not exists staff_account_requests_one_pending
  on public.staff_account_requests (user_id, kind)
  where status = 'pending';

alter table public.staff_account_requests enable row level security;

revoke all on table public.staff_account_requests from anon, authenticated;

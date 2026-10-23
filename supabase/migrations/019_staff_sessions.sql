-- One open staff session per account. The portal checks this key on each request.

create table if not exists public.staff_sessions (
  user_id uuid primary key references public.admin_profiles (id) on delete cascade,
  session_key text not null,
  seen_at timestamptz not null default now()
);

alter table public.staff_sessions enable row level security;

revoke all on table public.staff_sessions from anon, authenticated;

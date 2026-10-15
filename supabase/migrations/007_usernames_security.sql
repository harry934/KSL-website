-- Usernames (email optional), forced password change, sign-in rate limiting

alter table public.admin_profiles
  add column if not exists username text,
  add column if not exists contact_email text,
  add column if not exists must_change_password boolean not null default false;

-- Backfill: local part of the auth email, de-duplicated with a numeric suffix.
with base as (
  select p.id,
         regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9._-]', '', 'g') as stem,
         u.email
  from public.admin_profiles p
  join auth.users u on u.id = p.id
  where p.username is null
),
cleaned as (
  select id, email,
         case when length(stem) < 3 or stem !~ '^[a-z0-9]' then 'user' || substr(md5(id::text), 1, 6) else left(stem, 28) end as stem
  from base
),
ranked as (
  select id, email, stem, row_number() over (partition by stem order by id) as rn
  from cleaned
)
update public.admin_profiles p
set username = case when r.rn = 1 then r.stem else r.stem || r.rn end,
    contact_email = coalesce(p.contact_email, case when r.email like '%@staff.ksl.internal' then null else r.email end)
from ranked r
where r.id = p.id;

alter table public.admin_profiles alter column username set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_profiles_username_key'
  ) then
    alter table public.admin_profiles add constraint admin_profiles_username_key unique (username);
  end if;
end $$;

alter table public.admin_profiles drop constraint if exists admin_profiles_username_format;
alter table public.admin_profiles add constraint admin_profiles_username_format
  check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

-- Sign-in attempts (written by the portal server with the service role only).
create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  identifier text not null,
  ip text not null,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_identifier_idx on public.login_attempts (identifier, created_at desc);
create index if not exists login_attempts_ip_idx on public.login_attempts (ip, created_at desc);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);

alter table public.login_attempts enable row level security;
grant all on public.login_attempts to service_role;

-- Resolve a username to the auth email for sign-in. Service role only.
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
  where p.username = lower(trim(p_username)) and p.is_active
  limit 1
$$;

revoke all on function public.auth_email_for_username(text) from public, anon, authenticated;
grant execute on function public.auth_email_for_username(text) to service_role;

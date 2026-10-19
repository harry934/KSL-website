-- One-time passwords stop working 10 minutes after they are created or reset.
-- Null means the password was chosen by the person, or was issued before this limit.

alter table public.admin_profiles
  add column if not exists one_time_password_expires_at timestamptz;

-- A role name typed by an administrator. Access stays on each section.

alter table public.admin_profiles
  add column if not exists role_title text;

alter table public.admin_profiles
  drop constraint if exists admin_profiles_role_title_len;

alter table public.admin_profiles
  add constraint admin_profiles_role_title_len
  check (role_title is null or char_length(role_title) <= 40);

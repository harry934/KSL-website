-- Profile photo shown in the portal's top bar and staff list.
alter table public.admin_profiles
  add column if not exists avatar_path text;

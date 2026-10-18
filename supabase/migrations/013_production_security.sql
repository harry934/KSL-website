-- Visitors may read public images. They cannot upload, change, or delete files.
-- Documents stay in the private downloads bucket, which has no public read policy.

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media-public');

-- Settings are read by the public API with the service role.
-- The anon key should not read draft or internal setting rows directly.

drop policy if exists "downloads_settings_public_read" on public.downloads_settings;
drop policy if exists "products_settings_public_read" on public.products_settings;
drop policy if exists "csr_settings_public_read" on public.csr_settings;
drop policy if exists "site_image_overrides_public_read" on public.site_image_overrides;
drop policy if exists "services_settings_public_read" on public.services_settings;
drop policy if exists "organization_settings_public_read" on public.organization_settings;
drop policy if exists "press_settings_public_read" on public.press_settings;
drop policy if exists "careers_settings_public_read" on public.careers_settings;

create table if not exists public.contact_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_attempts_ip_idx on public.contact_attempts (ip, created_at desc);

alter table public.contact_attempts enable row level security;
grant all on public.contact_attempts to service_role;

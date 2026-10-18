-- Downloads can stay in the docs folder (standard) or live in storage.

alter table public.download_items
  add column if not exists source text;

update public.download_items
set source = case
  when coalesce(trim(external_href), '') <> '' then 'storage'
  else 'standard'
end
where source is null;

alter table public.download_items
  alter column source set default 'standard';

alter table public.download_items
  alter column source set not null;

alter table public.download_items
  drop constraint if exists download_items_source_check;

alter table public.download_items
  add constraint download_items_source_check check (source in ('standard', 'storage'));

-- A missing row means the photo that ships with the website is still used.

create table if not exists public.site_image_overrides (
  slot_id text primary key,
  source text not null check (source in ('standard', 'storage')),
  public_url text,
  storage_path text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

alter table public.site_image_overrides enable row level security;

drop policy if exists "site_image_overrides_public_read" on public.site_image_overrides;
create policy "site_image_overrides_public_read" on public.site_image_overrides
  for select to anon, authenticated using (true);

drop trigger if exists site_image_overrides_updated on public.site_image_overrides;
create trigger site_image_overrides_updated before update on public.site_image_overrides
  for each row execute function public.set_updated_at();

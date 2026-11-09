-- Optional long-form project details for the public “Read more” panel.
alter table public.projects add column if not exists details text;

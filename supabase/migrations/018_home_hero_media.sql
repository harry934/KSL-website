-- Home hero can store an ordered list of photos and videos.
-- Other photo slots stay a single image in public_url.

alter table public.site_image_overrides
  add column if not exists media jsonb not null default '[]'::jsonb;

-- Videos are larger than the photo cap. The upload API still limits photos to 8 MB
-- and only accepts video when the home hero asks for it.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
where id = 'media-public';

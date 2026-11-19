-- Allow gallery videos to be either a YouTube ID or a stored MP4/WebM file.
ALTER TABLE public.gallery_videos
  ALTER COLUMN youtube_id DROP NOT NULL;

ALTER TABLE public.gallery_videos
  DROP CONSTRAINT IF EXISTS gallery_videos_youtube_id_check;

ALTER TABLE public.gallery_videos
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS public_url text,
  ADD COLUMN IF NOT EXISTS content_type text;

ALTER TABLE public.gallery_videos
  ADD CONSTRAINT gallery_videos_youtube_id_check
  CHECK (youtube_id IS NULL OR youtube_id ~ '^[A-Za-z0-9_-]{6,20}$');

ALTER TABLE public.gallery_videos
  DROP CONSTRAINT IF EXISTS gallery_videos_source_check;

ALTER TABLE public.gallery_videos
  ADD CONSTRAINT gallery_videos_source_check
  CHECK (
    (youtube_id IS NOT NULL AND coalesce(storage_path, '') = '' AND coalesce(public_url, '') = '')
    OR (youtube_id IS NULL AND storage_path IS NOT NULL AND public_url IS NOT NULL)
  );

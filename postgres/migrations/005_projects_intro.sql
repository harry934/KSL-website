-- Optional page introduction for the Projects page (admin → website).
ALTER TABLE public.projects_settings
  ADD COLUMN IF NOT EXISTS kicker text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS intro text;

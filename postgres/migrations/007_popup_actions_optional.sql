-- Per-service popup buttons (optional). Empty label = hidden on the website.
ALTER TABLE public.service_items
  ADD COLUMN IF NOT EXISTS actions jsonb;

COMMENT ON COLUMN public.service_items.actions IS
  'Optional primary/secondary/tertiary popup buttons. Null = use services_settings.modal_actions defaults. Empty label hides a button.';

-- Optional extra buttons on home What we do popups.
ALTER TABLE public.home_what_we_do_items
  ADD COLUMN IF NOT EXISTS secondary_label text,
  ADD COLUMN IF NOT EXISTS secondary_link text,
  ADD COLUMN IF NOT EXISTS tertiary_label text,
  ADD COLUMN IF NOT EXISTS tertiary_link text;

-- Allow clearing the primary popup link (button becomes optional).
ALTER TABLE public.home_what_we_do_items
  ALTER COLUMN link SET DEFAULT '',
  ALTER COLUMN link_label SET DEFAULT '';

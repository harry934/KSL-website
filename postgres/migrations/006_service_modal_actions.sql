-- Editable service-popup action buttons (Request a quote / View projects / documents).
ALTER TABLE public.services_settings
  ADD COLUMN IF NOT EXISTS modal_actions jsonb NOT NULL DEFAULT '{
    "primary": {"label": "Request a quote", "href": "contact.html"},
    "secondary": {"label": "View projects", "href": "project.html"},
    "tertiary": {"label": "All corporate documents", "href": "downloads.html"}
  }'::jsonb;

COMMENT ON COLUMN public.services_settings.modal_actions IS
  'Labels and links for the three buttons at the bottom of the service detail popup.';

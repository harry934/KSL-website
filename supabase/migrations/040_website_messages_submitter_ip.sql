-- Store public client IP on contact form messages (abuse review; no RLS change).
alter table public.website_messages
  add column if not exists submitter_ip text;

comment on column public.website_messages.submitter_ip is
  'Public IP seen by the API at submit time (from trusted proxy headers). Not LAN/private IP.';

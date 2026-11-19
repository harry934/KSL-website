CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9][a-z0-9._-]{0,9}$'),
  password_hash text NOT NULL,
  contact_email text,
  display_name text NOT NULL DEFAULT '',
  role_title text CHECK (role_title IS NULL OR char_length(role_title) <= 40),
  avatar_path text,
  is_super_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  must_change_username boolean NOT NULL DEFAULT false,
  one_time_password_expires_at timestamptz,
  deleted_at timestamptz,
  created_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_profiles_active_idx ON public.admin_profiles (is_active) WHERE deleted_at IS NULL;

CREATE TABLE public.content_modules (
  key text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
INSERT INTO public.content_modules (key, label, sort_order) VALUES
  ('news', 'News', 10), ('events', 'Events', 20), ('gallery', 'Gallery', 30),
  ('services', 'Services', 40), ('products', 'Products', 50), ('projects', 'Projects', 55),
  ('careers', 'Careers', 60), ('faq', 'FAQ', 70), ('csr', 'CSR', 80),
  ('downloads', 'Downloads', 90), ('organization', 'Organization', 100),
  ('press', 'Press', 110), ('messages', 'Messages', 115),
  ('site_settings', 'Site settings', 120), ('staff', 'Staff management', 1000);

CREATE TABLE public.admin_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES public.content_modules(key) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_publish boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  UNIQUE (profile_id, module_key)
);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  module_key text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_created_idx ON public.activity_log (created_at DESC);
CREATE INDEX activity_log_actor_idx ON public.activity_log (actor_id, created_at DESC);

CREATE TABLE public.faq_groups (
  id text PRIMARY KEY,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);
CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id text NOT NULL REFERENCES public.faq_groups(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  category text,
  published_date date,
  image_path text,
  image_alt text,
  author text,
  location text,
  body_html text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  go_live_on date,
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);
CREATE INDEX news_items_public_idx ON public.news_items (published_date DESC) WHERE status = 'published' AND deleted_at IS NULL;

CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  category text DEFAULT 'all',
  tags text[] NOT NULL DEFAULT '{}',
  storage_path text,
  public_url text,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);
CREATE TABLE public.gallery_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id text NOT NULL CHECK (youtube_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  title text NOT NULL DEFAULT '',
  caption text,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.event_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  theme text,
  event_date date NOT NULL,
  time_start text,
  time_end text,
  timezone text NOT NULL DEFAULT 'Africa/Nairobi',
  venue text,
  description text,
  summary text,
  image_path text,
  image_alt text,
  body_html text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  go_live_on date,
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.services_settings (
  id text PRIMARY KEY DEFAULT 'default',
  intro text,
  download_catalog jsonb NOT NULL DEFAULT '{}'::jsonb,
  group_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category text,
  title text NOT NULL,
  excerpt text,
  detail text,
  image_path text,
  downloads jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_popup_id text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.careers_settings (
  id text PRIMARY KEY DEFAULT 'default',
  apply_email text NOT NULL DEFAULT 'careers@kenyashipyards.co.ke',
  apply_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.career_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('vacancy', 'internship')),
  title text NOT NULL,
  location text,
  summary text,
  closing_date date,
  apply_url text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.downloads_settings (
  id text PRIMARY KEY DEFAULT 'default',
  base_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.download_items (
  id text PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  category text NOT NULL,
  category_label text NOT NULL,
  language text,
  doc_date text,
  file_type text,
  file_name text,
  anchor text,
  alias_of text,
  external_href text,
  source text NOT NULL DEFAULT 'standard' CHECK (source IN ('standard', 'storage')),
  expires_on date,
  file_bytes bigint,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.organization_settings (
  id text PRIMARY KEY DEFAULT 'default',
  chart_download_id text,
  intro_kicker text,
  intro_title text,
  intro_body text,
  chart jsonb,
  board_sections jsonb,
  board_groups jsonb,
  milestones_title text,
  milestones_lead text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.organization_leadership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  summary text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);
CREATE TABLE public.organization_yards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lead text,
  summary text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);
CREATE TABLE public.organization_board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role text NOT NULL,
  board_group text NOT NULL DEFAULT 'independent' CHECK (char_length(btrim(board_group)) BETWEEN 1 AND 40),
  section text NOT NULL DEFAULT 'audit',
  summary text,
  bio text,
  photo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);
CREATE TABLE public.organization_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  happened_on date,
  date_precision text CHECK (date_precision IS NULL OR date_precision IN ('year', 'month', 'day')),
  title text,
  summary text,
  image_url text,
  image_alt text,
  image_slot text,
  story_key text,
  tag_label text,
  tag_note text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.press_settings (
  id text PRIMARY KEY DEFAULT 'default',
  boilerplate text,
  contact_email text,
  contact_phone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.press_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  href text,
  download_id text,
  asset_type text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.products_settings (
  id text PRIMARY KEY DEFAULT 'default',
  kicker text,
  title text,
  intro text,
  catalogue_url text,
  range_kicker text,
  range_title text,
  range_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  category_label text,
  eyebrow text,
  image_path text,
  image_alt text,
  key_specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  extra_specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  category text NOT NULL,
  category_label text NOT NULL,
  image_path text,
  details text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);
CREATE TABLE public.projects_settings (
  id text PRIMARY KEY DEFAULT 'default',
  group_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.csr_settings (
  id text PRIMARY KEY DEFAULT 'default',
  kicker text,
  title text,
  tagline text,
  intro text,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  hero_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '[]'::jsonb,
  footnote text,
  programmes_title text,
  programmes_intro text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.csr_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  image_path text,
  image_alt text,
  location text,
  event_date date,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);
CREATE TABLE public.site_image_overrides (
  slot_id text PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('standard', 'storage')),
  public_url text,
  storage_path text,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.website_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  other_name text,
  surname text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  preferred_contact text,
  submitter_ip text,
  risk_score smallint CHECK (risk_score IS NULL OR risk_score BETWEEN 0 AND 100),
  risk_flags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX website_messages_created_idx ON public.website_messages (created_at DESC);

CREATE TABLE public.login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier text NOT NULL,
  ip text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_identifier_idx ON public.login_attempts (identifier, created_at DESC);
CREATE INDEX login_attempts_ip_idx ON public.login_attempts (ip, created_at DESC);
CREATE TABLE public.contact_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_attempts_ip_idx ON public.contact_attempts (ip, created_at DESC);

CREATE TABLE public.staff_sessions (
  user_id uuid PRIMARY KEY REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  session_key text NOT NULL UNIQUE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  client_label text
);
CREATE INDEX staff_sessions_expiry_idx ON public.staff_sessions (expires_at);

CREATE TABLE public.staff_account_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('username', 'password')),
  requested_username text CHECK (requested_username IS NULL OR requested_username ~ '^[a-z0-9][a-z0-9._-]{0,9}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  CHECK ((kind = 'username' AND requested_username IS NOT NULL) OR (kind = 'password' AND requested_username IS NULL))
);
CREATE UNIQUE INDEX staff_account_requests_one_pending
  ON public.staff_account_requests (user_id, kind) WHERE status = 'pending';

CREATE TABLE public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  passcode_hash text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('create', 'password_reset')),
  contact_email text,
  phone text,
  is_super_admin boolean NOT NULL DEFAULT false,
  role_title text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_profile_id uuid REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (contact_email IS NOT NULL OR phone IS NOT NULL),
  CHECK ((kind = 'create' AND target_profile_id IS NULL) OR (kind = 'password_reset' AND target_profile_id IS NOT NULL))
);
CREATE INDEX staff_invites_open_idx ON public.staff_invites (kind, expires_at) WHERE used_at IS NULL;

CREATE TABLE public.content_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  entity_table text NOT NULL,
  entity_id text,
  entity_key text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  payload jsonb NOT NULL,
  submitted_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX content_drafts_entity_uidx ON public.content_drafts (entity_table, entity_id) WHERE entity_id IS NOT NULL;
CREATE UNIQUE INDEX content_drafts_key_uidx ON public.content_drafts (entity_table, entity_key) WHERE entity_id IS NULL;
CREATE TABLE public.draft_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  entity_table text NOT NULL,
  entity_id text,
  entity_key text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 300),
  author_id uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  reviewer_id uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX draft_returns_open_entity ON public.draft_returns (entity_table, entity_id)
  WHERE resolved_at IS NULL AND entity_id IS NOT NULL;
CREATE UNIQUE INDEX draft_returns_open_key ON public.draft_returns (entity_table, entity_key)
  WHERE resolved_at IS NULL AND entity_id IS NULL;

CREATE TABLE public.stored_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL CHECK (bucket_id IN ('media-public', 'downloads', 'avatars')),
  name text NOT NULL CHECK (name <> '' AND name !~ '(^/|//|(^|/)\.\.?(/|$)|\\)'),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  content_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket_id, name)
);
CREATE INDEX stored_files_bucket_idx ON public.stored_files (bucket_id, created_at DESC);

CREATE TABLE public.service_status_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service text NOT NULL,
  state text NOT NULL,
  latency_ms integer NOT NULL CHECK (latency_ms >= 0),
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_status_log_checked_at_idx ON public.service_status_log (checked_at DESC);

CREATE TRIGGER admin_profiles_updated BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'faq_groups', 'faq_items', 'news_items', 'gallery_photos', 'gallery_videos',
    'event_items', 'service_items', 'services_settings', 'careers_settings',
    'career_listings', 'downloads_settings', 'download_items', 'organization_settings',
    'organization_leadership', 'organization_yards', 'organization_board_members',
    'organization_milestones', 'press_settings', 'press_assets', 'products_settings',
    'products', 'projects', 'projects_settings', 'csr_settings', 'csr_projects',
    'site_settings', 'site_image_overrides', 'content_drafts'
  ]
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', table_name || '_updated', table_name);
  END LOOP;
END;
$$;

INSERT INTO public.services_settings (id) VALUES ('default');
INSERT INTO public.careers_settings (id) VALUES ('default');
INSERT INTO public.downloads_settings (id) VALUES ('default');
INSERT INTO public.organization_settings (id) VALUES ('default');
INSERT INTO public.press_settings (id) VALUES ('default');
INSERT INTO public.products_settings (id) VALUES ('default');
INSERT INTO public.projects_settings (id) VALUES ('default');
INSERT INTO public.csr_settings (id) VALUES ('default');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ksl_runtime') THEN
    RAISE EXCEPTION 'Role ksl_runtime is missing; provision postgres/bootstrap/roles.sql before migrating';
  END IF;
  GRANT USAGE ON SCHEMA public TO ksl_runtime;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ksl_runtime;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ksl_runtime;
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ksl_runtime';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ksl_runtime';
END;
$$;

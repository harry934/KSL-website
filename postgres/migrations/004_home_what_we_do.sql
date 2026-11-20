-- Home page "What we do" cards with recycle-bin soft delete.
CREATE TABLE IF NOT EXISTS public.home_what_we_do_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  excerpt text,
  detail text,
  image_path text,
  image_slot text,
  link text NOT NULL DEFAULT 'service.html',
  link_label text NOT NULL DEFAULT 'View all services',
  button_label text NOT NULL DEFAULT 'Read More',
  icon text NOT NULL DEFAULT 'ship',
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS home_what_we_do_items_live_idx
  ON public.home_what_we_do_items (sort_order)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.home_what_we_do_items IS
  'Cards under What we do on the home page. Soft-deleted rows stay until purged from the recycle bin.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ksl_runtime') THEN
    RAISE EXCEPTION 'Role ksl_runtime is missing; provision postgres/bootstrap/roles.sql before migrating';
  END IF;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_what_we_do_items TO ksl_runtime;
END
$$;

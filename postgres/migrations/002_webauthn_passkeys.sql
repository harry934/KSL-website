-- Restore WebAuthn passkey tables for local PostgreSQL authentication.
-- Incremental: safe on databases that already applied 001_standalone_schema.

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  challenge text PRIMARY KEY,
  purpose text NOT NULL CHECK (purpose IN ('registration', 'authentication')),
  user_id uuid REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  CHECK ((purpose = 'registration' AND user_id IS NOT NULL) OR purpose = 'authentication')
);
CREATE INDEX IF NOT EXISTS webauthn_challenges_expiry_idx ON public.webauthn_challenges (expires_at);

CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  credential_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0 CHECK (counter >= 0),
  transports text[] NOT NULL DEFAULT '{}',
  device_type text NOT NULL,
  backed_up boolean NOT NULL DEFAULT false,
  friendly_name text NOT NULL DEFAULT 'Passkey',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS webauthn_credentials_user_idx ON public.webauthn_credentials (user_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ksl_runtime') THEN
    RAISE EXCEPTION 'Role ksl_runtime is missing; provision postgres/bootstrap/roles.sql before migrating';
  END IF;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_challenges TO ksl_runtime;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_credentials TO ksl_runtime;
END;
$$;

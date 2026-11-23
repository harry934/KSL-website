-- Optional TOTP authenticator (2FA) for staff sign-in.

CREATE TABLE IF NOT EXISTS public.staff_totp (
  user_id uuid PRIMARY KEY REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  secret_enc bytea NOT NULL,
  enabled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_totp_setup (
  user_id uuid PRIMARY KEY REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  secret_enc bytea NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS staff_totp_setup_expiry_idx ON public.staff_totp_setup (expires_at);

CREATE TABLE IF NOT EXISTS public.staff_totp_recovery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_totp_recovery_user_hash_idx ON public.staff_totp_recovery (user_id, code_hash);
CREATE INDEX IF NOT EXISTS staff_totp_recovery_user_idx ON public.staff_totp_recovery (user_id) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS public.mfa_pending_logins (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS mfa_pending_logins_expiry_idx ON public.mfa_pending_logins (expires_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ksl_runtime') THEN
    RAISE EXCEPTION 'Role ksl_runtime is missing; provision postgres/bootstrap/roles.sql before migrating';
  END IF;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_totp TO ksl_runtime;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_totp_setup TO ksl_runtime;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_totp_recovery TO ksl_runtime;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.mfa_pending_logins TO ksl_runtime;
END;
$$;
-- Require new staff to register an authenticator before using the portal.

ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS must_setup_totp boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mfa_pending_logins'
  ) THEN
    ALTER TABLE public.mfa_pending_logins
      ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'login';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'mfa_pending_logins_purpose_check'
    ) THEN
      ALTER TABLE public.mfa_pending_logins
        ADD CONSTRAINT mfa_pending_logins_purpose_check CHECK (purpose IN ('login', 'recovery'));
    END IF;
  END IF;
END $$;
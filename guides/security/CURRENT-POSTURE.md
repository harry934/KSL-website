# Current security posture

Updated March 2026. Burp / pen-test scope: [../BURP-SECURITY-BRIEF.md](../BURP-SECURITY-BRIEF.md). Historical notes remain in [production-security-audit.md](production-security-audit.md) and [security-coverage.md](security-coverage.md). Dashboard steps stay in [dashboard-security-steps.md](dashboard-security-steps.md).

**Live check (March 2026):** Migration `security_lockdown_followup` is applied. `information_schema` shows **no** table privileges for `anon` / `authenticated` on `public` — direct PostgREST reads with the anon key should fail. Supabase advisor still warns **leaked-password protection disabled** (enable in Auth settings).

## Closed in code

- Invite signup username checks are on the middleware public allowlist (`/api/auth/invite/username-check`).
- Unauthenticated `/api/*` access is deny-by-default except `/api/public/*` and the explicit auth public path set.
- Contact Turnstile **fails closed in production** when `TURNSTILE_SECRET_KEY` is missing. Local/preview may still run without Turnstile.
- Published and saved links use a shared server allowlist (`safeLink`): `http(s)`, `mailto`, `tel`, and same-site relative paths. Careers `apply_url` is rejected on save if unsafe; public careers payloads drop unsafe values.
- Rate-limit client IP prefers `x-real-ip`, then the **first** `X-Forwarded-For` hop (Vercel).
- Visitor download PDFs live in `/docs/`. Internal security guides live here under `guides/security/`. `.cursor/` is not tracked.

## Still dashboard / ops

- Confirm Turnstile keys on the staff-portal Vercel project before production traffic.
- Confirm Supabase public sign-up is off, storage anon write policies are absent, migration 016 applied, backups, and a second super-admin.
- When attaching `kenyashipyards.co.ke`, update CORS, CSP `connect-src`, and passkey RP ID / redirect allowlist for the admin hostname.

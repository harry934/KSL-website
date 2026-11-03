# Security work covered

Date: 19 October 2026. Project: Kenya Shipyards Limited website and staff portal. Supabase project `envqgczfhxywkxcnsxrt`, free plan.

The audit was read-only. Remediation after that is in this repository. Production Auth settings were changed in the Dashboard by the project owner. The database migration has not been applied, and these files have not been deployed.

Leaked-password protection and scheduled database backups need a Pro plan. Both are skipped. The project stays on the free plan.

## Audit

- Public site, staff portal, live Vercel hosts, and the connected Supabase project.
- All 32 public tables: row level security, policies, and `anon` / `authenticated` privileges.
- Storage buckets, Security Advisor, and public API responses for careers, events, and news.
- Unauthenticated Data API reads. Private tables were denied.
- Repository history for committed secrets, and the portal lockfile audit.
- No critical vulnerability was confirmed. Visitors do not receive a Supabase client. The service-role key stays on the server.

## Done in the Dashboard (free plan)

- Public sign-up turned off. Staff accounts are created from the portal.
- Supabase account MFA enabled for the Dashboard login.
- Project MFA was left available and was not required for every session. The portal has no second-factor screen, so requiring it would lock out the only staff user.

## Skipped because the plan is free

- **Prevent use of leaked passwords.** The Email provider page reports this as Pro and above, powered by Have I Been Pwned. The portal still requires at least 10 characters with a letter and a number. Set that same minimum on the Email provider page if the field is editable. Use a long staff password that is not reused elsewhere.
- **Scheduled backups and point-in-time recovery.** Project Settings → Database → Backups asks for an upgrade. The free substitute is an occasional database dump, saved outside Supabase, from the connection string under Project Settings → Database.

## Still free, and still worth confirming

- Authentication → URL Configuration: Site URL `https://ksl-websitekiza.vercel.app`. Extra redirect URLs limited to that origin and local development. No wildcard.

## Done in the staff portal

- Rate limits use `x-real-ip`, then the last `X-Forwarded-For` hop.
- Contact form requires a short-lived challenge. Optional Cloudflare Turnstile runs only after its keys are set.
- `kenyashipyards.co.ke` removed from the portal CORS allow-list. The allowed browser origin is `https://ksl-website.vercel.app`.
- Staff APIs refuse a session until the one-time password and username are changed.
- Signed download URLs are limited to modules that profile may view.
- Uploads are checked against file bytes, not only the browser content type.
- New profile photos go to a private `avatars` bucket after the migration exists. Until then they stay on the public media bucket.
- HTML from the CMS is passed through an allow-list sanitizer.
- Public content routes filter `status = published` in SQL, including news go-live dates.
- Existing staff can add a passkey from My account and sign in with it. The sign-in still requires an active staff profile. The OAuth server stays off. Turn passkeys on under Authentication → Passkeys before they can be used. The relying party is `ksl-websitekiza.vercel.app` until the portal moves to the company domain.

## Done on the public site

- Careers and organization text is escaped before it is written into the page.
- Apply links allow only `http`, `https`, `mailto`, and `tel`.
- jQuery 3.7.1 and the Bootstrap bundle are served from `lib/vendor`.
- Content security policy drops the jQuery and jsDelivr script hosts, allows Cloudflare Turnstile, and sets `frame-ancestors 'self'`.
- `unsafe-inline` and `unsafe-eval` remain because Google Translate needs them.

## Written, not applied

`supabase/migrations/016_lock_down_api_grants.sql`

- Revokes remaining `anon` and `authenticated` table privileges, including `TRUNCATE`, `TRIGGER`, `REFERENCES`, and `MAINTAIN`.
- Turns on row level security for `content_modules`.
- Pins `search_path` on `set_updated_at`.
- Sets size and file-type limits on `media-public`, `downloads`, and a new private `avatars` bucket.

Apply this only when ready, in the same window as the staff portal deploy. Do not run any `GRANT SELECT` suggested by a Data API error.

## Checked locally

- Portal typecheck passed.
- Contact challenge returns 200. A contact post without it returns 400.
- Careers and events stay empty while unpublished rows exist. News returns the 4 published items. Downloads include no private file references.
- Careers, organization, and contact pages load. Local jQuery is 3.7.1. A `javascript:` apply link is dropped.
- The live Vercel site still sends the previous content security policy until these files are deployed. The contact page already calls `/api/public/contact-token` on the deployed portal, so that form fails until the portal deploy.

## Left as they are

- Next.js stays on 15. The lockfile has 6 high and 1 moderate advisory in the ESLint and PostCSS toolchain. The suggested fix is a Next.js 16 upgrade, which was not applied.
- `kenyashipyards.co.ke` still serves WordPress, including `xmlrpc.php`. Point the domain at the new site, and disable XML-RPC, before adding that origin back to the portal allow-list.
- Turnstile keys stay unset until a widget exists. The contact challenge still runs without them.
- No commit and no deploy were made as part of this work.

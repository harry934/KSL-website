# Dashboard steps still required

These settings live in the Supabase Dashboard. They are not in the repository, and they were not changed during the code remediation. The project stays on the free plan. The full list of what was covered is in [security-coverage.md](security-coverage.md).

Do not run the `GRANT SELECT` statement suggested by a Data API error. Anonymous clients are supposed to be denied.

## 1. Turn off public sign-up

1. Open [Authentication → Email provider](https://supabase.com/dashboard/project/envqgczfhxywkxcnsxrt/auth/providers?provider=Email).
2. Under Email, turn **Allow new users to sign up** off.
3. Save. Confirm `disable_signup` would now be true. The live check on 19 October 2026 returned `false`.

Staff accounts are created from the portal with the service role. Public registration does not create an `admin_profiles` row, but it can still create Auth users and send confirmation email.

## 2. Leaked-password protection — skipped

The Email provider page says **Prevent use of leaked passwords** is only available on the Pro plan and above. It stays off while this project is on the free plan.

On that same page, set the minimum password length to at least 10 if the field is editable, matching the portal rule. Use a long staff password that is not reused elsewhere. Supabase will not check it against known leaks until the project is upgraded.

## 3. Multi-factor authentication

Two different MFA switches exist. Do not confuse them.

**Supabase account (the login that opens the Dashboard)**

1. Open [Account security](https://supabase.com/dashboard/account/security).
2. Enable an authenticator-app factor for the account that owns this project.
3. Register a second factor on another device. Supabase does not issue recovery codes.

**Staff portal users**

The portal has no enrollment screen and no second-factor step after `signInWithPassword`. Turning on a project rule that demands `aal2` now would lock out the only staff user.

1. Open Authentication → Multi-Factor in the project Dashboard and leave app-authenticator (TOTP) enrollment available.
2. Do not require MFA for every session until the portal can enroll a factor and complete the challenge. That application work is not in this change.
3. Official behaviour is described in [Multi-Factor Authentication](https://supabase.com/docs/guides/auth/auth-mfa).

## 4. Redirect allow-list and backups

1. Open [URL configuration](https://supabase.com/dashboard/project/envqgczfhxywkxcnsxrt/auth/url-configuration).
2. Set Site URL to the staff portal origin, `https://ksl-websitemink.vercel.app`.
3. Keep additional redirect URLs limited to that origin and local development. Remove any wildcard or unused site.
4. Scheduled backups and point-in-time recovery are skipped. That page asks for a Pro upgrade. On the free plan, take an occasional database dump from Project Settings → Database and store it outside Supabase.

## 5. Optional contact bot check

The contact form now requires a short-lived token from the portal. For a stronger check, create a Cloudflare Turnstile widget and set these on the staff portal only:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Leave them unset until the widget exists. The form still works with the token check.

## 6. Apply the database migration separately

`supabase/migrations/016_lock_down_api_grants.sql` is in the repository and has not been applied. Apply it only after review, and deploy the staff portal in the same window. Until the `avatars` bucket exists, new profile photos stay on the existing public bucket. After the migration, new photos go to the private `avatars` bucket.

## 7. Dependency review

`npm audit` on `staff-portal/package-lock.json` reported 6 high and 1 moderate issue, with no critical issue. They are in `eslint-config-next` and a nested `postcss` used by the current Next.js 15 release. The audit's suggested fix is a Next.js 16 major upgrade. That upgrade was not applied: it is a breaking framework change, and the advisories were not shown to be exploitable in the running portal. Re-check them when Next.js 15 publishes a patched release, or when a planned framework upgrade is already in scope.

## 8. Company domain

`kenyashipyards.co.ke` still serves the WordPress site, including `xmlrpc.php`. The portal no longer trusts that origin for browser calls. Point the domain at the new site, and disable XML-RPC on WordPress, before adding the domain back to the portal allow-list.

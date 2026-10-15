# KSL website + content portal — project status

Last updated: October 2026

## What is live

| Piece | Where | Notes |
|-------|-------|-------|
| Public website (static HTML/CSS/JS) | Vercel project `ksl-website` → https://ksl-website.vercel.app | Repo root. Root Directory = `.` |
| Staff content portal (Next.js 15) | Vercel project `ksl-website_mink` → https://ksl-websitemink.vercel.app/login | Folder `staff-portal/`. Root Directory = `staff-portal` |
| Database, auth, file storage | Supabase project `envqgczfhxywkxcnsxrt` | Migrations in `supabase/migrations/` |
| Source code | https://github.com/harry934/KSL-website (`main`) | One repo, two Vercel projects |

## Portal modules

| Status | Modules |
|--------|---------|
| Live | Dashboard, Staff, News, Events, Gallery, Press, Services, Products, Organization, Careers, CSR, FAQ, Downloads, Site settings, Activity log, Account |

- Staff are created by the super admin only (no public sign-up). Each agent gets per-module view / edit / publish / delete rights.
- Agents and admins sign in with **username or email**. Email is optional when creating an account.
- Content has draft / published status; the public site only ever sees published rows.

## How the public site gets content

- Every public page has `data-ksl-content-api="https://ksl-websitemink.vercel.app"` on `<html>`.
- `js/ksl-content.js` reads `/api/public/*` from the portal and falls back to `data/*.json` if the portal is unreachable.
- Public APIs are read-only GET endpoints, cached ~60 seconds at the edge.

## Database migrations

| File | Adds |
|------|------|
| `001_staff_portal_schema.sql` | Staff profiles, module permissions, activity log, FAQ, news |
| `002_gallery_photos.sql` | Gallery |
| `003_events_services.sql` | Events, services |
| `004_careers_downloads.sql` | Careers, downloads |
| `005_organization_press.sql` | Organization, press |
| `006_products_csr_settings.sql` | Products, CSR projects, site settings |
| `007_usernames_security.sql` | Usernames, optional contact email, forced password change, login rate limiting |

## Security summary

- Service role key lives only in the portal's Vercel env (server side). The static site has no secrets.
- Staff APIs check the session and module permission on every request; `/api/public/*` is read-only.
- Sign-in is rate limited (5 failures per username/IP → 15-minute lockout) and returns one generic error.
- Passwords: minimum 10 characters with letters and numbers. Admin password resets force a change at next sign-in.
- Security headers (CSP, HSTS, frame blocking) on all portal pages; CORS on public APIs limited to the KSL site origins.

## Manual steps still owned by the team

- [ ] Supabase → Authentication → Providers → Email: **disable sign-ups**, enable **leaked-password protection**.
- [ ] Enable MFA for the super admin when convenient.
- [ ] Vercel `ksl-website_mink` → Settings → Deployment Protection: turn **off** for Production so staff only see the portal sign-in.
- [ ] Rotate the Supabase service role key if it was ever shared outside Vercel.
- [ ] If the public site moves to a domain other than `kenyashipyards.co.ke`, add it to `ALLOWED_ORIGINS` in `staff-portal/src/middleware.ts`.

## Related docs

- [DEPLOYMENT.md](./DEPLOYMENT.md) — architecture and full deployment steps
- [VERCEL-GITHUB-SETUP.md](./VERCEL-GITHUB-SETUP.md) — Vercel project settings and root-directory troubleshooting
- [../staff-portal/README.md](../staff-portal/README.md) — local development and import scripts

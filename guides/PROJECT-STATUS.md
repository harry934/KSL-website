# KSL website + admin portal — project status

Last updated: March 2026

## What is live

| Piece | Where | Notes |
|-------|-------|-------|
| Public website (static HTML/CSS/JS) | Vercel project `ksl-website` → https://ksl-website.vercel.app | Repo root. Root Directory = `.` |
| Staff admin portal (Next.js 15) | Vercel project `ksl-website_kiza` → https://ksl-websitekiza.vercel.app/login | Folder `staff-portal/`. Root Directory = `staff-portal` |
| Database, auth, file storage | Supabase project `envqgczfhxywkxcnsxrt` | Migrations `001`–`039` in `supabase/migrations/` |
| Source code | https://github.com/harry934/KSL-website (`main`) | One repo, two Vercel projects |

## Portal modules

| Status | Modules |
|--------|---------|
| Live | Dashboard, Staff, News, Events, Gallery, Press kit, Services, Products, **Projects**, Organisation (chart, board, milestones), Careers, Community (CSR), Questions (FAQ), Downloads, Messages, Site settings, Drafts, Activity log, My account |

- Staff are created by the super admin only (no public sign-up). Each agent gets per-section rights: See, Change, Put live, Remove.
- Everyone signs in with **username and password** only. When the admin adds an agent (or clicks "New password"), the portal shows a **one-time password** once; the agent must choose their own password at first sign-in.
- Editors use plain forms only (no code, JSON or HTML): photo and file upload buttons, a word-processor box for long text, up/down arrows for order, and an "On website / Hidden" switch. Web address endings are generated from the title.
- Content has hidden (draft) / on website (published) status; the public site only ever sees published rows. Agents without "Put live" can save drafts only.
- Site settings has a **website banner**: a full-width strip under the menu on every public page, with a tag, message, button, three colour styles, optional moving text and an optional end date. A live preview is shown while editing.
- The portal uses the same look and behaviour as the KSL Task Management System: progress bar and "Please wait…" overlay while saving, a notification bell (changes by other staff in the sections you can see), profile photos, a visible Sign out button, search with Clear and 25 items per page on every list, searchable dropdowns, password show/hide with live hints, and activity log filters (person, section, what happened, date range).
- Gallery: 57 photos and 3 videos.
- Document links point to the site's own `docs/` folder.

## How the public site gets content

- Every public page has `data-ksl-content-api="https://ksl-websitekiza.vercel.app"` on `<html>`.
- `js/ksl-content.js` reads `/api/public/*` from the portal and falls back to `data/*.json` if the portal is unreachable.
- Public APIs are read-only GET endpoints, cached ~60 seconds at the edge.

## Database migrations

**39 files** in `supabase/migrations/` (`001_staff_portal_schema.sql` through `039_projects_details.sql`). Apply in numeric order.

Early migrations (001–011) cover the core portal schema, gallery, events, services, careers, downloads, organisation, press, products, CSR, settings, usernames, messages, and board. Later migrations add projects, staff invites, organisation chart/milestones, drafts, recycle bin, storage hardening, and security follow-ups. Full list: see repo folder or [PRODUCTION-OVERVIEW-AND-VPS.md](./PRODUCTION-OVERVIEW-AND-VPS.md#6-database-migrations).

## Security summary

- Service role key lives only in the portal's Vercel env (server side). The static site has no secrets.
- Staff APIs check the session and module permission on every request; `/api/public/*` is read-only.
- Sign-in is rate limited (5 failures per username or 20 per IP → 15-minute lockout, with the unlock time shown) and otherwise returns one generic error.
- Passwords: minimum 10 characters with letters and numbers. One-time passwords are 12 random characters, shown once, and must be changed at first sign-in.
- Security headers (CSP, HSTS, frame blocking) on all portal pages; CORS on public APIs limited to the KSL site origins.

## Manual steps still owned by the team

- [ ] Supabase → Authentication → Providers → Email: **disable sign-ups**, enable **leaked-password protection**.
- [ ] Enable MFA for the super admin when convenient.
- [ ] Vercel `ksl-website_kiza` → Settings → Deployment Protection: turn **off** for Production so staff only see the portal sign-in.
- [ ] Rotate the Supabase service role key if it was ever shared outside Vercel.
- [ ] If the public site moves to a domain other than `kenyashipyards.co.ke`, add it to `ALLOWED_ORIGINS` in `staff-portal/src/middleware.ts`.

## Production target

Planned go-live: **one Linux VPS** (`www.kenyashipyards.co.ke` + private portal hostname), **Supabase Cloud unchanged**. See [PRODUCTION-OVERVIEW-AND-VPS.md](./PRODUCTION-OVERVIEW-AND-VPS.md). Track regressions with [VPS-MIGRATION-CHECKLIST.md](./VPS-MIGRATION-CHECKLIST.md).

## Related docs

- [PRODUCTION-OVERVIEW-AND-VPS.md](./PRODUCTION-OVERVIEW-AND-VPS.md) — technical overview, stack, VPS migration runbook
- [DEPLOYMENT.md](./DEPLOYMENT.md) — architecture and full deployment steps (Vercel)
- [VERCEL-GITHUB-SETUP.md](./VERCEL-GITHUB-SETUP.md) — Vercel project settings and root-directory troubleshooting
- [../staff-portal/README.md](../staff-portal/README.md) — local development and import scripts

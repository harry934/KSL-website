# KSL Admin portal (staff)

Private admin for Kenya Shipyards website content. **Do not** deploy on a hostname containing `admin`. Use an unguessable URL and do not link from the public site.

**Full deploy guide (two Vercel projects + Supabase):** [../guides/DEPLOYMENT.md](../guides/DEPLOYMENT.md)

## Cursor + Supabase MCP

This repo includes [`.cursor/mcp.json`](../.cursor/mcp.json) for the Supabase MCP server (project `envqgczfhxywkxcnsxrt`). After reloading Cursor:

1. Approve the server when prompted (or run `cursor agent mcp enable supabase`).
2. Authenticate: `cursor agent mcp login supabase`
3. Verify: `cursor agent mcp list`

Optional: `npx skills add supabase/agent-skills` for Supabase-focused agent skills.

## Setup

1. **Supabase SQL** — In [Supabase Dashboard](https://supabase.com/dashboard) → SQL → New query, run the full script:
   `../supabase/migrations/001_staff_portal_schema.sql` through `011_messages_module.sql`

2. **Environment** — Copy `.env.example` to `.env.local` (already configured locally; never commit `.env.local`).

3. **First super admin** (after SQL succeeds):
   ```bash
   cd staff-portal
   node scripts/bootstrap-super-admin.mjs yourusername YourSecurePassword1 "Your Name" [optional@email.com]
   ```

4. **Run locally** (must be inside `staff-portal`, not the main website folder):
   ```bash
   cd staff-portal
   npm run dev
   ```
   Wait until the terminal shows **Ready** (first start can take ~30–60s while `/login` compiles).

   Then open exactly:
   - **http://localhost:3000/login**  
   - or **http://127.0.0.1:3000/login**

   Root `http://localhost:3000/` redirects to login when you are signed out.

   If port 3000 is busy, run `npm run dev -- -p 3001` and use http://localhost:3001/login

## Security

- Rotate the **service role** key if it was ever shared in chat or email.
- Enable MFA for super admins in Supabase Auth when available.
- Deploy to a dedicated Vercel project with `X-Robots-Tag: noindex` (middleware sets this).

## Modules

| Status | Module |
|--------|--------|
| Live | Dashboard, Staff, News, Events, Gallery, Press kit, Services, Products, Organisation, Careers, Community (CSR), Questions (FAQ), Downloads, Messages, Site settings, Activity log, My account |

Production: https://ksl-websitekiza.vercel.app/login — sign in with **username and password**.

New agents: Staff → Invite staff. Add email and/or mobile plus their role. The portal shows a 6-digit passcode and `/signup` link once; send both. They enter the passcode, choose username and password, then use normal `/login`. "Reset invite" on a staff row (or approving a password request) sends the same style of link for a new password only.

Apply `supabase/migrations/029_staff_invites.sql` in Supabase before using invites. Optional env: `NEXT_PUBLIC_PORTAL_URL` (defaults to the Vercel URL / `https://ksl-websitekiza.vercel.app`).

Shared form pieces live in `src/components/ui/` (`form-bits`, `image-field`, `file-field`, `row-list`, `item-list`, `list-tools`, `search-select`, `password-input`, `rich-text`, `feedback`). Use them for new editors so wording and styling stay consistent.

The look follows the KSL Task Management System: top progress bar and "Please wait…" overlay (wrap slow work in `withBusy` from `lib/upload-client.ts`; `uploadFile` and `sendJson` already do), notification bell, profile photo in the user chip, quiet Sign out button, list search with Clear and 25 per page, searchable dropdowns, password show/hide with live hints, and activity log filters.

### Connect the public website

Every public page already sets the portal URL on the root element (no trailing slash):

```html
<html lang="en" data-ksl-content-api="https://ksl-websitekiza.vercel.app">
```

The site loads `js/ksl-content.js` and reads FAQ, news, events, services, products, CSR, gallery, careers, downloads, organization, press and site settings from `/api/public/*` with fallback to local `data/*.json`.

### Deploy on Vercel

1. Import the `staff-portal` folder as a new project.
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Use a **non-obvious** hostname (not `admin.*).
4. Set `data-ksl-content-api` on the main site to that URL.

Import from the main site JSON:
```bash
node scripts/import-faq-from-json.mjs
node scripts/import-news-from-json.mjs
node scripts/import-events-from-json.mjs
node scripts/import-services-from-json.mjs
node scripts/import-careers-from-json.mjs
node scripts/import-downloads-from-json.mjs
node scripts/import-organization-from-json.mjs
node scripts/import-press-from-json.mjs
node scripts/import-products-from-json.mjs
node scripts/import-csr-from-json.mjs
```

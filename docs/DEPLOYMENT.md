# KSL website + admin portal — deployment guide

**GitHub repo:** https://github.com/harry934/KSL-website  

**Quick Vercel clicks:** [VERCEL-GITHUB-SETUP.md](./VERCEL-GITHUB-SETUP.md)  
**Current status:** [PROJECT-STATUS.md](./PROJECT-STATUS.md)

| Live URL | Vercel project |
|----------|----------------|
| https://ksl-website.vercel.app | `ksl-website` (root `.`) |
| https://ksl-websitemink.vercel.app/login | `ksl-website_mink` (root `staff-portal`) |

This repo has **two separate apps** that share one **Supabase** project. They deploy to **two different Vercel projects** (or two hosts). They do **not** share a folder on the server.

## Architecture (what lives where)

```
┌─────────────────────────────┐     HTTPS GET only      ┌──────────────────────────────┐
│  Public website (static)    │ ──────────────────────► │  Staff portal (Next.js)      │
│  ksl-website.vercel.app     │   /api/public/news      │  ksl-websitemink.vercel.app  │
│  Repo root: index.html,     │   /api/public/faq, …    │  Repo folder: staff-portal/  │
│  css/, js/, data/, img/     │                         │  /login, /news, /api/*       │
└──────────────┬──────────────┘                         └──────────────┬───────────────┘
               │                                                        │
               │  fallback: local data/*.json if API fails            │  service role
               │                                                        │  (server only)
               └────────────────────────┬───────────────────────────────┘
                                        ▼
                          ┌─────────────────────────────┐
                          │  Supabase (cloud)           │
                          │  Postgres + Auth + Storage  │
                          │  Project: envqgczfhxywkxcnsxrt │
                          └─────────────────────────────┘
```

| Piece | Where to host | URL example | Purpose |
|--------|----------------|-------------|---------|
| **Main website** | Vercel `ksl-website` — **root directory** = repo root (not `staff-portal`) | `https://ksl-website.vercel.app` (later `kenyashipyards.co.ke`) | Public HTML/CSS/JS |
| **Staff portal (admin)** | Vercel `ksl-website_mink` — **root directory** = `staff-portal` | `https://ksl-websitemink.vercel.app` | Login + CMS only |
| **Database & auth** | [Supabase](https://supabase.com/dashboard) (already created) | `https://envqgczfhxywkxcnsxrt.supabase.co` | Content + staff users |

**Do not** put the portal on `admin.kenyashipyards.co.ke` or link it from the public site menu. Staff bookmark `/login` on the obscure URL.

---

## Part A — Supabase (one-time, mostly done)

1. Run SQL migrations in order:  
   `supabase/migrations/001_…` through `007_usernames_security.sql`  
   (Dashboard → SQL, or already applied via MCP.)

2. **Auth hardening** (Dashboard → Authentication → Providers → Email):
   - Turn **off** “Enable sign ups” (invite-only).
   - Turn **on** leaked-password protection.
   - Enable **MFA** for super-admin accounts when available.

3. **Secrets** (Dashboard → Settings → API):
   - `anon` key → safe in browser / Vercel `NEXT_PUBLIC_*`
   - `service_role` key → **only** on staff-portal server (Vercel env), never in the static site

4. Rotate **service role** if it was ever exposed in chat or email.

5. Import content (from your PC, with `.env.local` in `staff-portal`):
   ```bash
   cd staff-portal
   node scripts/import-faq-from-json.mjs
   node scripts/import-news-from-json.mjs
   # … other import-*.mjs scripts as needed
   ```

---

## Part B — Deploy staff portal (admin)

1. [Vercel](https://vercel.com) → **Add New Project** → import this Git repo.

2. **Root Directory** → set to **`staff-portal`** (critical).

3. Framework: Next.js (auto-detected). Build: `npm run build`, output: default.

4. **Environment variables** (Production + Preview):

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://envqgczfhxywkxcnsxrt.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase API settings |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase API settings (secret) |

5. Deploy. Production URL: `https://ksl-websitemink.vercel.app`.

6. Optional: Settings → Domains → add a **custom** obscure subdomain you do not advertise.

7. Sign in: `https://YOUR-PORTAL-URL/login`  
   Use the super-admin username (or email) and password.

8. Vercel **Deployment Protection** blocks staff who are not on your Vercel team. Keep it **off** for Production; the portal's own sign-in is the gate.

`staff-portal/src/middleware.ts` sets CORS on **`/api/public/*`** for the KSL site origins (GET only): `ksl-website.vercel.app` (and its preview URLs), `kenyashipyards.co.ke`, `www.kenyashipyards.co.ke`, and localhost. Security headers (CSP, HSTS, frame blocking) are in `staff-portal/next.config.ts`. Portal functions run in `dub1` (Dublin), next to the Supabase database in `eu-west-1` (`staff-portal/vercel.json`).

---

## Part C — Deploy main website

1. **Second** Vercel project → same repo, **root directory** = **`.`** (repository root).

2. No Supabase keys required on the static site unless you add serverless functions later.

3. Connect production domain (`kenyashipyards.co.ke` / `www`).

4. **Connect site to portal** — on **every** public HTML page (or once in a shared template), set on `<html>`:

   ```html
   <html lang="en" data-ksl-content-api="https://ksl-websitemink.vercel.app">
   ```

   (Already set on every public page.)

   - Use the portal origin **only** (no trailing slash, no `/login`).
   - `js/ksl-content.js` (via `js/scripts.js`) will call  
     `https://YOUR-PORTAL-URL/api/public/news`, etc.
   - If the portal is down, pages fall back to `data/*.json`.

5. Redeploy the main site after changing `data-ksl-content-api`.

---

## How they communicate (not direct DB from the browser)

| Direction | Mechanism |
|-----------|-----------|
| Browser → main site | Static files from Vercel/CDN |
| Browser → portal **public API** | `fetch(portal + '/api/public/...')` — read published content |
| Browser → portal **admin** | Cookies + Supabase Auth; only staff with `admin_profiles` |
| Portal server → Supabase | `SUPABASE_SERVICE_ROLE_KEY` for writes; anon + RLS for public reads |

The main website **never** gets the service role key. Attackers can only hit **public GET** endpoints (same as published content).

---

## Checklist after go-live

- [ ] Portal URL works; `/login` does not appear on Google (middleware `noindex`)
- [ ] Main site has `data-ksl-content-api` pointing at portal
- [ ] Edit news in portal → refresh main site → change visible (may take ~60s cache)
- [ ] Supabase sign-ups disabled
- [ ] Service role only in Vercel portal project env
- [ ] Staff change password at `/account`

---

## Local development

| App | Command | URL |
|-----|---------|-----|
| Portal | `cd staff-portal && npm run dev` | http://localhost:3000/login |
| Main site | any static server at repo root | e.g. Live Server / `npx serve` |

For local testing with live API, set on `index.html`:

```html
data-ksl-content-api="http://localhost:3000"
```

(CORS on `/api/public/*` allows this in dev.)

---

## Remote changes from Cursor (MCP)

With `.cursor/mcp.json` linked to your Supabase project, you can run migrations and SQL from the IDE. **Auth settings** (disable sign-up, MFA) must still be toggled in the Supabase Dashboard — they cannot be fully enforced from SQL alone.

See also: `staff-portal/README.md` for module list and import scripts.

# Deploy KSL to GitHub + Vercel (your repo)

## GitHub (already done)

| Item | Value |
|------|--------|
| Repository | **https://github.com/harry934/KSL-website** |
| Branch | `main` |
| Latest code | Push with `git push origin main` when you have local commits |

Both the **public website** (repo root) and **`staff-portal/`** are in this repo.

---

## Vercel — two projects (you must sign in once)

Vercel cannot be completed from this machine without **your** Vercel login. Use the dashboard (about 10 minutes):

### 1) Public website

1. Open **[Import KSL-website on Vercel](https://vercel.com/new/import?s=https://github.com/harry934/KSL-website)** (sign in with GitHub if asked).
2. **Project name:** e.g. `ksl-website` (public).
3. **Root Directory:** leave **empty** (repository root).
4. **Framework Preset:** Vercel usually detects **Other** / static — no build command needed.
5. **Environment variables:** none required for the static site.
6. Deploy → note the URL (e.g. `https://ksl-website.vercel.app`) or attach **kenyashipyards.co.ke** under *Settings → Domains*.

### 2) Staff portal (admin / CMS)

1. **[Import the same repo again](https://vercel.com/new/import?s=https://github.com/harry934/KSL-website)** as a **second** project.
2. **Project name:** use something **unguessable**, e.g. `ksl-content-7f3a9c` — not `admin` or `staff`.
3. **Root Directory:** click **Edit** → set to **`staff-portal`** (the **folder name**, not `main` and not empty).

> **Wrong root directory?** Vercel → your portal project → **Settings → General → Root Directory** → `staff-portal` → Save → **Redeploy**.  
> Keep **`ksl-website`** (public site) on **empty** root — never `staff-portal`.
4. **Framework Preset:** **Next.js** (auto).
5. **Environment variables** (Production + Preview) — from Supabase → Project Settings → API:

   | Name | Where |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon `public` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**secret**) |

6. Deploy → open `https://YOUR-PORTAL-URL.vercel.app/login` and sign in.

**Do not** link the portal from the public site menu. Bookmark `/login` only for staff.

### 3) Connect public site → portal API

After the portal deploy works, on the main site set on `<html>` (all pages or shared header template):

```html
<html lang="en" data-ksl-content-api="https://YOUR-PORTAL-URL.vercel.app">
```

Commit and push → Vercel redeploys the **website** project.

---

## Optional: deploy from your PC (CLI)

```powershell
npm i -g vercel
cd "path\to\kenya-shipyards website"
vercel login

# Public site (root)
vercel --prod

# Portal (second link — choose staff-portal as root when prompted)
cd staff-portal
vercel --prod
```

Add the same three Supabase env vars in the Vercel dashboard for the **portal** project (or `vercel env add`).

---

## Checklist

- [ ] GitHub `main` is up to date
- [ ] Vercel project #1 — repo root — public site live
- [ ] Vercel project #2 — `staff-portal` — `/login` works
- [ ] Supabase Auth: sign-ups **disabled**
- [ ] `data-ksl-content-api` set on production HTML
- [ ] Service role key **only** on portal project, never on static site

See also: [DEPLOYMENT.md](./DEPLOYMENT.md)

# VPS migration — regression checklist

Use this when moving from Vercel to your Linux VPS **or** after any production infra change. Mark each row **Pass / Fail / N/A** and note the failure (URL, screenshot, log line).

**Related:** [PRODUCTION-OVERVIEW-AND-VPS.md](./PRODUCTION-OVERVIEW-AND-VPS.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## How to use

1. **Baseline on Vercel** (before DNS cutover): run sections A–D on `https://ksl-website.vercel.app` and portal URL; save results.
2. **Staging on VPS** (hosts file or temporary hostname): run the same tests; fix **Fail** items before go-live.
3. **After DNS cutover:** run again within 24 hours; attach this sheet to your go-live record.

| Field | Value |
|-------|--------|
| Tested by | |
| Date | |
| Public URL | |
| Portal URL | |
| VPS OS / Node version | |

---

## A. Hosting and routing (common VPS breakages)

| # | Check | Expected | Vercel | VPS | Notes |
|---|--------|----------|--------|-----|-------|
| A1 | Unknown path `/this-page-does-not-exist` | Custom **404.html**, HTTP **404** | | | Nginx: `error_page 404 /404.html`. Without it you get a plain Nginx 404. |
| A2 | Nested unknown path `/foo/bar/missing` | Same custom 404; CSS/JS load (not a blank page) | | | Fixed by `<base href="/">` on `404.html`. |
| A3 | Direct `/404.html` | Branded 404 page loads | | | |
| A4 | `/404.html?blocked=1` | “That text was blocked” copy | | | |
| A5 | Extensionless URL e.g. `/about` | Resolves to `about.html` or redirects | | | Nginx: `try_files … $uri.html`. Vercel may differ; prefer linking `*.html` in content. |
| A6 | HTTPS + apex `kenyashipyards.co.ke` | Redirects to `www` | | | |
| A7 | Security headers on public home | CSP, HSTS present | | | On VPS headers come from **Nginx**, not `vercel.json`. |
| A8 | `vercel.json` routes | N/A on VPS | Catch-all → `404.html` with 404 status | N/A | |

---

## B. Public site ↔ portal API

| # | Check | Expected | Vercel | VPS | Notes |
|---|--------|----------|--------|-----|-------|
| B1 | `data-ksl-content-api` on `<html>` | Points to **production portal** origin (no trailing slash) | | | Wrong host → stale content or `data/*.json` fallback only. |
| B2 | Home news/events blocks | Live data within ~60s of portal publish | | | |
| B3 | Each major page (see list below) | Content loads, no endless spinner | | | |
| B4 | Portal down simulation | Page still renders from `data/*.json` | | | Block portal host in hosts file briefly. |
| B5 | Browser console on home | No CSP `connect-src` blocks to portal or `*.supabase.co` | | | Update Nginx CSP when portal hostname changes. |
| B6 | CORS | `GET /api/public/settings` from public origin succeeds | | | `staff-portal/src/middleware.ts` → `ALLOWED_ORIGINS`. |

**Pages to spot-check:** `index.html`, `news.html`, `article.html?slug=…`, `event.html?slug=…`, `service.html`, `products.html`, `project.html`, `faq.html`, `careers.html`, `downloads.html`, `videos.html`, `contact.html`, `organization.html`, `board.html`, `csr.html`, `about.html`.

---

## C. Dynamic “not found” (in-page, not 404.html)

| # | Check | Expected | Vercel | VPS | Notes |
|---|--------|----------|--------|-----|-------|
| C1 | `article.html?slug=not-a-real-slug` | “We couldn't find that story” + button to news | | | Does **not** redirect to `404.html` by design. |
| C2 | `event.html?slug=not-a-real-slug` | “We couldn't find that event” | | | |
| C3 | Contact blocked input → redirect | Lands on `404.html?blocked=1` | | | From `js/main.js`. |

---

## D. Contact form and Turnstile

| # | Check | Expected | Vercel | VPS | Notes |
|---|--------|----------|--------|-----|-------|
| D1 | Contact form loads widget | Turnstile visible | | | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on portal. |
| D2 | Submit valid message | Success; row in portal **Messages** | | | |
| D3 | Turnstile domain allowlist | Widget works on **www** production domain | | | Cloudflare Turnstile dashboard. |

---

## E. Staff portal (on VPS)

| # | Check | Expected | Vercel | VPS | Notes |
|---|--------|----------|--------|-----|-------|
| E1 | `/login` | Sign-in page; not Vercel deployment protection | | | |
| E2 | Session cookie | `Secure` in production over HTTPS | | | |
| E3 | Edit + publish news | Public site shows change after cache TTL | | | |
| E4 | Media upload | File in Supabase Storage; URL loads | | | `client_max_body_size` in Nginx. |
| E5 | Staff invite link | Uses `NEXT_PUBLIC_PORTAL_URL` | | | |
| E6 | `SUPABASE_*` env | All three keys set on server only | | | Never on static site. |

---

## F. Supabase (unchanged host, verify anyway)

| # | Check | Expected | Pass |
|---|--------|----------|------|
| F1 | Migrations **001–039** applied | No missing tables in portal | |
| F2 | Public sign-ups disabled | Invite-only staff | |
| F3 | Service role | Not in repo; only portal server env | |

---

## G. Performance and ops

| # | Check | Expected | Pass |
|---|--------|----------|------|
| G1 | `pm2` / systemd | Portal restarts after reboot | |
| G2 | Certbot renewal dry-run | Succeeds | |
| G3 | `git pull` deploy | Static + portal rebuild documented | |

---

## Known differences (Vercel → VPS)

| Area | Vercel today | VPS risk |
|------|--------------|----------|
| Custom 404 | `404.html` + `vercel.json` routes | Must configure Nginx `error_page`; nested URLs need `<base href="/">` |
| Security headers | `vercel.json` | Must copy to Nginx; easy to miss CSP `connect-src` |
| Portal region | `dub1` in `staff-portal/vercel.json` | Pick EU-friendly VPS; latency to Supabase |
| Env vars | Vercel dashboard | `.env.production` on disk — permissions `600` |
| Logs | Vercel dashboard | Nginx + `pm2 logs` |
| Preview URLs | `*.vercel.app` in CORS | Remove or keep during transition |

---

## Failure log (copy rows as needed)

| Date | ID | URL / steps | Expected | Actual | Fixed in commit? |
|------|-----|-------------|----------|--------|----------------|
| | | | | | |

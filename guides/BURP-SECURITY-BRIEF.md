# Burp Suite / penetration test brief

**For authorised testers only.** Scope: public site + staff portal + Supabase project backing the CMS.

**Last verified:** March 2026 (code + live Supabase grants).

---

## Scope

| Host | In scope |
|------|-----------|
| `https://ksl-website.vercel.app` | Public static site |
| `https://kenyashipyards.co.ke` / `www` | When live |
| `https://ksl-websitekiza.vercel.app` | Staff portal (provide **agent** + **super-admin** test accounts) |
| `https://*.supabase.co` (project API) | Only with anon key from portal bundle — expect **deny** on table reads |

**Out of scope:** Vercel platform, Supabase platform control plane, third-party CDNs (Google Fonts, Turnstile, YouTube) except as they affect our pages.

---

## What is already locked down (low yield)

| Control | Detail |
|---------|--------|
| **Direct database access** | Live DB: **zero** `SELECT` grants for `anon` / `authenticated` on `public` tables. Burp PostgREST with anon key should **not** return CMS rows. |
| **Migration 038** | Applied live (`security_lockdown_followup`). |
| **Staff APIs** | Unauthenticated calls to `/api/news`, `/api/staff`, etc. → **401**. |
| **RBAC** | Module permissions on CMS writes; super-admin only on staff management. |
| **Login rate limit** | 5 failures / 15 min per username; 20 / 15 min per IP. |
| **Contact form** | Turnstile (required in production), HMAC challenge (2s min age), honeypot, 5 posts/hour/IP, code-like input blocked. |
| **Secrets** | Service role **server-only**; not in public site JS. |
| **Session** | HttpOnly cookies, SameSite=Lax, idle timeout, single active browser session binding. |
| **Portal** | `X-Robots-Tag: noindex`; not linked from public menu. |

---

## Worth testing (expected behaviour)

| Area | Test | Expected |
|------|------|----------|
| Contact | `POST /api/public/contact` without Turnstile | **400** in production |
| Contact | Replay challenge / &lt;2s submit | **400** `too_fast` |
| Contact | Spoof `X-Forwarded-For` on Vercel | Rate limit still ties to real IP (`x-vercel-forwarded-for` / `x-real-ip`) |
| Auth | Password spray | **429** / lockout message with Nairobi time |
| Auth | Invite passcode brute force | **429** per token |
| CMS | Agent tries `POST` publish without permission | **403** or draft-only |
| CMS | Stored XSS in news body | Sanitized server + client; no execution on public `article.html` |
| IDOR | Random UUIDs in recycle/upload APIs | **403/404** |
| CORS | Evil `Origin` on `/api/public/news` | No `Access-Control-Allow-Origin` (browser blocked; curl still OK) |

---

## Known limitations (not bugs)

| Item | Why |
|------|-----|
| Anon key in portal JS | Required for Supabase Auth in browser; **table access revoked** at DB layer. |
| Public `GET /api/public/*` | Intentionally unauthenticated; same data as published website. |
| Public CSP `unsafe-inline` | Legacy static templates; XSS impact only if CMS sanitizer bypassed. |
| `curl` bypasses CORS | By design; abuse controls are rate limits + Turnstile on writes. |

---

## Dashboard actions (ops — before heavy testing)

| Item | Where |
|------|--------|
| Disable public sign-ups | Supabase → Authentication |
| **Enable leaked-password protection** | Supabase → Auth (currently **off** — enable for production) |
| Turnstile keys on portal production | Vercel env + Cloudflare allowed domains |
| MFA for super-admin | Supabase Auth |

---

## VPS note

On Linux VPS set `TRUSTED_PROXY_HOPS=1` in portal env so rate limits use the IP nginx appends (not a spoofed `X-Forwarded-For` prefix).

See also: [security/CURRENT-POSTURE.md](security/CURRENT-POSTURE.md), [../SECURITY_AUDIT_REPORT.md](../SECURITY_AUDIT_REPORT.md), [VPS-MIGRATION-CHECKLIST.md](VPS-MIGRATION-CHECKLIST.md).

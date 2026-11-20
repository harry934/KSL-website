# KSL Domain, Cloudflare, HostPinnacle VPS and Website Deployment Guide

**Audience:** Someone connecting the new KSL website to `kenyashipyards.co.ke` without breaking the existing company website.  
**Branch this guide matches:** `vps-postgres` only. Do not merge this into `main` for go-live.  
**Safety:** This document is instructions only. It does **not** change DNS, Cloudflare, the VPS, or the old website. Do not run cutover commands until you have completed the checklists at the end.

**Related project docs (already in the repo):**

- [DEPLOYMENT.md](./DEPLOYMENT.md) — full VPS install / PostgreSQL / systemd steps  
- [guides/POST-DEPLOY-AUDIT.md](./guides/POST-DEPLOY-AUDIT.md) — portal URL `/kwela`, content import gates  
- [guides/STABILITY-AUDIT-2026-11-19.md](./guides/STABILITY-AUDIT-2026-11-19.md) — live IP API checks  
- [guides/VPS-STAGE-1-STATUS.md](./guides/VPS-STAGE-1-STATUS.md) — early VPS inventory notes  
- [postgres/README.md](./postgres/README.md) — database roles and backups  

---

## How to read this document

| Label | Meaning |
|-------|---------|
| **Verified** | Checked from this repository and/or read-only public DNS/HTTP lookups on 20 Nov 2026 |
| **From project docs / code** | Present in configs or guides on `vps-postgres`, but not re-confirmed live on the VPS shell in this session |
| **Assumption / still to confirm** | You must check before go-live; do not treat as proven |

No passwords, API keys, database URLs with credentials, Cloudflare tokens, or private keys appear in this guide.

---

## 1. What each service does (they are not the same company)

Think of three separate jobs:

```text
Safaricom          →  owns / renews the domain name registration
Cloudflare         →  answers "where does kenyashipyards.co.ke go?" (DNS)
                     and can sit in front of the website (proxy + SSL)
HostPinnacle VPS   →  the Linux computer that runs Nginx, Node, PostgreSQL,
                     and the new website files
```

| Service | Provider (your arrangement) | What it controls | What it does **not** control |
|---------|-----------------------------|------------------|------------------------------|
| Domain registrar | **Safaricom** | Who owns `kenyashipyards.co.ke`, renewal, and which **nameservers** the domain uses | Website files, Nginx, database |
| DNS / edge | **Cloudflare** | DNS records (A, CNAME, MX, TXT…), optional proxy (“orange cloud”), SSL/TLS mode to visitors | The app code on the VPS (unless you wrongly point DNS elsewhere) |
| Hosting | **HostPinnacle VPS** | The server OS, firewall, Nginx, Node portal, PostgreSQL, uploaded files | Domain renewal; public DNS unless you change Cloudflare |

**How they work together**

1. A visitor types `https://kenyashipyards.co.ke`.  
2. The internet asks the domain’s **nameservers** (Cloudflare) for an IP.  
3. Cloudflare returns either its own proxy IPs (orange cloud) or your VPS IP (grey cloud / DNS-only).  
4. The request reaches the HostPinnacle VPS.  
5. **Nginx** on the VPS serves the public HTML and proxies `/kwela` to the Node staff portal.  
6. The portal talks to **PostgreSQL** and local file storage on the same VPS.

Changing something at Safaricom does not automatically update HostPinnacle. Changing HostPinnacle does not update Cloudflare. You must update the right place for each step.

---

## 2. Verified picture of the current setup

### 2.1 Domain and DNS (**Verified** — public lookups, 20 Nov 2026)

| Item | Value |
|------|--------|
| Domain | `kenyashipyards.co.ke` |
| Nameservers | `jamie.ns.cloudflare.com`, `kayden.ns.cloudflare.com` |
| Apex `A` records | `172.67.167.159`, `104.21.67.18` (these are **Cloudflare proxy** addresses, not your VPS) |
| `www` A/CNAME | No separate answer found in `dig` for `www.kenyashipyards.co.ke` |
| Mail `MX` | `kenyashipyards-co-ke.mail.protection.outlook.com` (Microsoft 365) |
| SPF `TXT` | Includes Outlook (`spf.protection.outlook.com`) |

**Meaning:** DNS is already managed at Cloudflare. Public apex traffic currently goes through Cloudflare’s proxy. The public DNS does **not** show your HostPinnacle IP, because orange-cloud proxy hides the origin IP.

Registrar = Safaricom is **from your infrastructure description** (not re-confirmed by whois in this session). Nameservers pointing at Cloudflare **are** confirmed.

### 2.2 New website on HostPinnacle (**Verified** where noted)

| Item | Value | Status |
|------|--------|--------|
| VPS public IP | `178.162.219.218` | **Verified** in Nginx template, env examples, deploy scripts, and live HTTP |
| Public site (today) | `http://178.162.219.218/` | **Verified** — returns “Kenya Shipyards Limited”, Nginx 1.24.0 (Ubuntu) |
| Staff portal (today) | `http://178.162.219.218/kwela/login` | **Verified** — HTTP 200 |
| Portal health API | `http://178.162.219.218/kwela/api/health` | **Verified** — `{"status":"ok","database":"up"}` |
| Node listen address | `127.0.0.1:3000` (not public) | **From code / systemd template** |
| Public document root (live scripts) | `/var/www/kenyashipyards` | **From deploy scripts** (`apply-update.sh`, `recover-now.sh`) |
| Alternate / older doc path | `/var/www/ksl` | **From** `publish-public.sh` default and `DEPLOYMENT.md` |
| App clone (preferred by scripts) | `/opt/kenyashipyards/admin-api` | **From** deploy scripts |
| Alternate clone path in docs | `/opt/ksl-website` | **From** `DEPLOYMENT.md` |
| Storage root | `/var/lib/ksl-portal/files` | **From** `.env.example` / systemd |
| Database | PostgreSQL database `ksl` on `127.0.0.1:5432` | **From** project config; health says DB is up |
| Process manager | systemd unit `ksl-portal` | **From** `deploy/vps/ksl-portal.service` / install script |
| Current TLS on IP site | Plain **HTTP on port 80** (no Let’s Encrypt hostname yet in the IP Nginx template) | **Verified** from live responses |

### 2.3 Expected URLs after domain cutover (**From project intent**)

| Role | Recommended production URL | Notes |
|------|----------------------------|--------|
| Public website | `https://www.kenyashipyards.co.ke` (apex → www) | Matches older production overview docs |
| Staff portal | `https://www.kenyashipyards.co.ke/kwela` **or** a separate unguessable hostname | Current VPS layout uses **path** `/kwela` on the same host |
| Public API base | Same origin as portal + `/api/public/...` (with base path: `/kwela/api/public/...`) | Public pages get this from `js/portal-host.js` |

Do **not** advertise the portal in the public menu. Portal responses already send `X-Robots-Tag: noindex`.

### 2.4 Application ports (**From configs + live checks**)

| Port | Service | Should be public? |
|------|---------|-------------------|
| 22 | SSH | Yes (restricted by key / firewall) |
| 80 | Nginx HTTP | Yes (or redirect to 443 after TLS) |
| 443 | Nginx HTTPS | Yes after certificates |
| 3000 | Next.js portal | **No** — loopback only behind Nginx |
| 5432 | PostgreSQL | **No** — loopback only |
| 3306 | MySQL (if still installed) | **No** — leave alone; not used by `vps-postgres` portal |
| 8443 | Legacy split-port portal template | Optional / older design; current preferred layout uses `/kwela` on 80/443 |

### 2.5 Environment variables that control URLs and auth (**From** `staff-portal/.env.example`)

| Variable | Controls |
|----------|----------|
| `NEXT_PUBLIC_SITE_URL` | Public website base URL (emails/UI, build-time) |
| `NEXT_PUBLIC_PORTAL_URL` | Portal base URL including `/kwela` (invites, redirects, media URLs, passkeys) |
| `PUBLIC_SITE_ORIGIN` | Extra CORS / browser origin for the public site (comma-separated allowed) |
| `NEXT_PUBLIC_BASE_PATH` | Must be `/kwela` with the current Nginx layout |
| `DATABASE_URL` | Runtime Postgres connection (role `ksl_runtime`) — **never** put in HTML |
| `STORAGE_DIR` | Private upload root |
| `STORED_FILE_SIGNING_SECRET`, `CONTACT_TOKEN_SECRET`, `MESSAGE_VIEW_UNLOCK_SECRET` | Signing / contact / message unlock |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Contact form bot protection |
| `TRUSTED_PROXY_HOPS` | Should be `1` behind Nginx so rate limits see real client IPs |
| `NODE_ENV` | `production` |

Hard-coded CORS allow-list in `staff-portal/src/middleware.ts` already includes:

- `https://ksl-website.vercel.app`
- `https://kenyashipyards.co.ke`
- `https://www.kenyashipyards.co.ke`

plus whatever you set in `PUBLIC_SITE_ORIGIN`.

Public HTML uses `js/portal-host.js`. When `var origin` is set (currently the VPS `/kwela` URL in this branch), every page’s `data-ksl-content-api` is rewritten to that portal origin.

### 2.6 Nginx behaviour (**From** `deploy/vps/nginx/kenyashipyards-ip.conf`)

Current preferred IP template:

- Listens on **port 80**, `server_name 178.162.219.218`
- Document root: `/var/www/kenyashipyards`
- Static files: `try_files $uri $uri/ $uri.html =404`
- Portal: `location /kwela` → `http://127.0.0.1:3000`
- Temporary redirects: `/admin` → `/kwela`, and bare `/api/stored-file` → `/kwela/api/stored-file...`
- Upload body size: `100m`

Older alternate templates still exist:

- `ksl-public.conf` — HTTPS on 443 with self-signed IP cert + `/storage/media-public/` alias  
- `ksl-portal.conf` — HTTPS portal on **8443**

Prefer the `/kwela` layout already running on the VPS unless you intentionally redesign hostnames.

### 2.7 How the Node app is kept running (**From** deploy scripts)

- systemd service `ksl-portal`  
- `ExecStart=... npm run start -- --hostname 127.0.0.1 --port 3000`  
- Depends on `postgresql.service`  
- Env from `/etc/ksl-portal.env` and/or `staff-portal/.env.production`  
- Updates: `deploy/vps/apply-update.sh`, `finish-rebuild.sh`, `restart-portal.sh`

### 2.8 HTTPS / SSL today vs go-live

| Layer | Today (IP staging) | After domain go-live |
|-------|--------------------|----------------------|
| Browser → Cloudflare | N/A for raw IP | Cloudflare edge certificate (Automatic HTTPS) |
| Cloudflare → VPS | N/A | Must match Cloudflare SSL/TLS mode (see Step 7) |
| VPS certificates | IP site is HTTP-only in the preferred template | Let’s Encrypt (certbot) or Cloudflare Origin Certificate on Nginx |
| Staff cookies / passkeys | HTTP IP works for password login smoke tests | Prefer HTTPS production origins before passkeys |

---

## 3. Old website vs new website — can they interfere?

### 3.1 What we know about the old site

| Finding | Status |
|---------|--------|
| Historical company site is **WordPress** on `kenyashipyards.co.ke` (including `xmlrpc.php`) | **From** repo security guides and saved scrapes under `tools/scrape/` |
| Scrape HTML also referenced an internal host `10.104.4.139` for WordPress | **From** scrape files — likely private/hosting network; not your public VPS IP |
| Public DNS for the apex currently resolves to **Cloudflare proxy IPs**, not `178.162.219.218` | **Verified** |
| From this environment, `https://kenyashipyards.co.ke/` returned a Cloudflare “One moment, please…” challenge page, so the **origin HTML behind Cloudflare was not re-inspected here** | **Verified limitation** |
| On `http://178.162.219.218/`, WordPress paths (`/wp-login.php`, `/xmlrpc.php`, `/wp-content/`, etc.) return **404** from the new Nginx site | **Verified** |
| Deploy docs warn that WordPress / osTicket may exist **elsewhere on the same VPS** under different document roots | **From** `DEPLOYMENT.md` / `postgres/README.md` / `publish-public.sh` comments |

### 3.2 Same VPS or different server?

**Do not guess.** Evidence summary:

- The **new** site is definitely on HostPinnacle IP `178.162.219.218`.  
- The **old** WordPress site is **not** what Nginx serves as the default site on that IP (WordPress URLs 404 there).  
- That does **not** prove WordPress is absent from the same VPS. It could still live under another Nginx/Apache vhost, another document root, another port, or a different server entirely, while Cloudflare’s **origin** still points at that old host.

**Confirm on the VPS (read-only) before any cutover:**

```sh
# List web roots and enabled sites — do not delete anything
ls /etc/nginx/sites-enabled 2>/dev/null
ls /etc/apache2/sites-enabled 2>/dev/null
sudo nginx -T 2>/dev/null | grep -E 'server_name|root |listen '
# Look for WordPress / osTicket paths without changing them
sudo ls -ld /var/www/* /srv/* /home/*/public_html 2>/dev/null
```

Also open Cloudflare → DNS and note the **current origin IP** (grey-cloud the record temporarily only if policy allows, or check Cloudflare dashboard “origin” / DNS edit screen). Compare that origin IP to `178.162.219.218`.

### 3.3 Conflict checklist

| Risk | What goes wrong | How to avoid |
|------|-----------------|--------------|
| Same domain / subdomain | Visitors hit the wrong site | Keep Cloudflare origin on the **old** host until the new site is tested; switch only at cutover |
| DNS points to wrong server | Domain shows old site, or new site never receives traffic | Inventory Cloudflare A/AAAA/CNAME **before** editing; change one record at a time |
| Conflicting Nginx / Apache vhosts | Both claim `server_name kenyashipyards.co.ke` or both use `default_server` | Add a **new** server block; do not overwrite the WordPress vhost |
| Same ports (80/443) | Only one process can bind a port | One reverse proxy (Nginx) should own 80/443 and route by `server_name` / path |
| Same PostgreSQL / MySQL DB | Accidental drops or shared credentials | New app uses Postgres DB `ksl` only. **Leave MySQL and WordPress DB untouched** |
| Shared file directories | `publish-public.sh` uses `rsync --delete` and can wipe a folder | Only publish to `/var/www/kenyashipyards` (or a dedicated `/var/www/ksl`). **Never** point `DEST` at WordPress/`wp-content` |
| Old redirects / SSL / cache | Users still see old pages or mixed content | Lower Cloudflare TTL before cutover; purge CF cache after switch; set SSL mode correctly |
| Deploy overwrites old config | Copying Nginx files over the live WordPress site file | Install new site as `sites-available/kenyashipyards` (already the project name) and leave other site files alone |

### 3.4 Safe parallel run (recommended)

1. Keep Cloudflare DNS origin pointing at the **current** (old) website host.  
2. Continue testing the new site at `http://178.162.219.218/` and `/kwela/login`.  
3. Optionally add a **temporary** hostname in Cloudflare, e.g. `new.kenyashipyards.co.ke` → `178.162.219.218` (DNS-only or proxied), and put that name in Nginx `server_name` + env URLs for a dress rehearsal.  
4. When ready, change **only** the apex/`www` records to the HostPinnacle IP (see Step 4).  
5. Do **not** delete WordPress files, databases, or vhosts as part of cutover. Park or leave them until management confirms retirement.

**This guide never instructs you to delete, overwrite, disable, migrate, or modify the old KSL website.**

---

## 4. Final architecture (adapted to this project)

```text
Visitor browser
      │
      │  https://kenyashipyards.co.ke  (and/or www)
      ▼
Domain registration (Safaricom)
      │  nameservers → Cloudflare
      ▼
Cloudflare DNS (+ optional proxy / WAF / edge SSL)
      │  A/AAAA → HostPinnacle VPS 178.162.219.218
      ▼
HostPinnacle VPS (Ubuntu)
      │
      ├─ Nginx :80 / :443
      │     ├─ /                → static public site  (/var/www/kenyashipyards)
      │     ├─ /kwela           → reverse proxy → 127.0.0.1:3000 (Next.js staff portal)
      │     └─ (optional) /storage/media-public/ → public upload files only
      │
      ├─ systemd ksl-portal → Node Next.js on 127.0.0.1:3000
      │
      ├─ PostgreSQL 127.0.0.1:5432  database ksl
      │     roles: ksl_runtime (app), ksl_migrator (schema only)
      │
      └─ Local files  STORAGE_DIR=/var/lib/ksl-portal/files
            media-public / downloads / avatars

Mail stays separate: MX → Microsoft 365 (do not point MX at the VPS).
```

**Not in the live VPS path anymore (on this branch):** Supabase database/auth/storage for the portal. Historical Supabase notes remain under `guides/` for archive only.

**Still separate until you retire them:** Vercel preview hosts (`ksl-website.vercel.app`, `ksl-websitekiza.vercel.app`) and the old WordPress origin behind Cloudflare.

---

## 5. Step-by-step deployment / cutover guide

Follow in order. Where a step says **change**, pause and confirm you are ready. Steps marked **verify** are safe checks.

---

### Step 1 — Understand Safaricom vs Cloudflare vs HostPinnacle

**Goal:** Know which dashboard to open for which job.  
**Where:** Conceptual (this section).  

| If you need to… | Open… |
|-----------------|-------|
| Renew the domain / change nameservers | Safaricom (registrar) |
| Change where the website points, SSL mode, cache | Cloudflare |
| Install packages, Nginx, Node, Postgres, firewall | HostPinnacle VPS SSH |

**Verify:** Nameservers already show Cloudflare (Step 2). You should almost never need Safaricom again for day-to-day website pointing unless nameservers drift.

**Common mistake:** Editing “DNS” inside a hosting panel that is **not** Cloudflare while nameservers still point at Cloudflare — those edits are ignored.

---

### Step 2 — Verify nameservers point at Cloudflare

**Goal:** Confirm Cloudflare is authoritative.  
**Where:** Your laptop terminal and/or Cloudflare dashboard.

```sh
dig +short NS kenyashipyards.co.ke
```

**Expected (Verified today):**

```text
jamie.ns.cloudflare.com.
kayden.ns.cloudflare.com.
```

**Also check** Safaricom’s domain panel: nameserver fields should match Cloudflare’s assigned NS pair (exact hostnames may differ per Cloudflare account; they must match what Cloudflare shows under the domain’s Overview).

**Common mistake:** Mixing one Cloudflare NS with an old registrar NS — DNS becomes inconsistent.

---

### Step 3 — Inventory existing Cloudflare DNS records (do not delete yet)

**Goal:** Know what every record does before changing anything.  
**Where:** Cloudflare → domain → **DNS** → Records.

Make a spreadsheet or screenshot of:

| Type | Name | Content | Proxy status | Purpose (fill in) |
|------|------|---------|--------------|-------------------|
| A | `@` / `kenyashipyards.co.ke` | *(current origin or CF)* | Proxied / DNS only | Website |
| A/CNAME | `www` | … | … | Website |
| MX | `@` | Outlook protection host | DNS only | Email — **do not break** |
| TXT | `@` | SPF / verification | DNS only | Email / domain proofs |
| Others | `mail`, `autodiscover`, etc. | … | … | Usually email — leave alone |

**Also note:** Cloudflare SSL/TLS mode (Overview or SSL/TLS → Overview): Off / Flexible / Full / Full (strict).

**Verify:** MX still points at Outlook. Changing website A records must not remove MX/TXT.

**Common mistake:** Deleting “unknown” TXT records and breaking Microsoft 365 or domain verification.

**What not to do:** Do not delete records until you know their purpose. Prefer editing the website A/AAAA (or CNAME) only.

---

### Step 4 — Create or update DNS to point at the HostPinnacle VPS

**Goal:** Send web traffic to `178.162.219.218` when you are ready.  
**Where:** Cloudflare DNS.  
**When:** Only after Steps 5–11 are green on the IP (or on a staging hostname).

**Suggested records for cutover** (adjust names to match your UI):

| Type | Name | Content | Proxy |
|------|------|---------|--------|
| A | `@` | `178.162.219.218` | Proxied (orange) **or** DNS-only (grey) for first test |
| A or CNAME | `www` | `178.162.219.218` **or** CNAME to `@` | Same as apex |

**Before cutover (safe practice):**

1. Lower TTL if Cloudflare allows (or rely on short proxy TTL).  
2. Optional: create `new.kenyashipyards.co.ke` → `178.162.219.218` and test first.  
3. At cutover time, change apex/`www` to the VPS IP.  
4. Leave **MX** and mail-related **TXT** unchanged.

**Verify from your laptop:**

```sh
dig +short A kenyashipyards.co.ke
dig +short A www.kenyashipyards.co.ke
```

With **DNS-only** (grey cloud), you should eventually see `178.162.219.218`.  
With **proxied** (orange cloud), you will still see Cloudflare IPs — that is normal. Then verify with:

```sh
curl -sI https://www.kenyashipyards.co.ke/ | head -20
```

You want the new site title/content (Kenya Shipyards Limited static site), not WordPress admin paths succeeding as a CMS.

**Common mistakes:**

- Pointing only `www` and forgetting apex (or the reverse).  
- Accidentally changing MX.  
- Switching DNS before Nginx knows the hostname and before HTTPS works.

---

### Step 5 — Configure Nginx for public site + admin portal

**Goal:** Hostname-aware (or IP) routing without touching WordPress vhosts.  
**Where:** VPS SSH; files from this repo under `deploy/vps/nginx/`.

**Current working IP config (already in repo):** `kenyashipyards-ip.conf`.

For domain go-live, create a **new** server block (example — review before applying):

```nginx
# Example only — install as a NEW sites-available file.
# Do NOT overwrite an existing WordPress site file.

# Redirect apex → www (optional but recommended)
server {
    listen 80;
    listen [::]:80;
    server_name kenyashipyards.co.ke;
    return 301 https://www.kenyashipyards.co.ke$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name www.kenyashipyards.co.ke;

    root /var/www/kenyashipyards;
    index index.html;
    client_max_body_size 100m;

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    location = /admin { return 301 /kwela; }
    location /admin/ {
        rewrite ^/admin/(.*)$ /kwela/$1 permanent;
    }

    location = /api/stored-file {
        return 301 /kwela/api/stored-file$is_args$args;
    }

    location /kwela {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_set_header Connection "";
        client_max_body_size 100m;
        client_body_timeout 300s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_request_buffering on;
    }
}
```

Then obtain certificates (Step 6) so Certbot can add `listen 443 ssl` blocks, **or** paste a Cloudflare Origin Certificate yourself.

**Commands pattern:**

```sh
sudo nginx -t
sudo systemctl reload nginx
```

**Expected:** `nginx: configuration file ... syntax is ok` / `test is successful`.

**Verify:**

```sh
curl -sI -H 'Host: www.kenyashipyards.co.ke' http://127.0.0.1/ | head -15
curl -sI -H 'Host: www.kenyashipyards.co.ke' http://127.0.0.1/kwela/login | head -15
```

**Common mistakes:**

- Using `default_server` on the new site and stealing traffic meant for another vhost.  
- Running `DEST=/var/www/...wrong... publish-public.sh` and wiping WordPress.  
- Forgetting `/kwela` proxy so the portal 404s while the public site works.

---

### Step 6 — Configure HTTPS certificates on the VPS

**Goal:** Valid TLS on the VPS origin (especially if Cloudflare is Full / Full strict).  
**Where:** VPS.

**Option A — Let’s Encrypt (works when the domain already points here, or with DNS challenge):**

```sh
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d www.kenyashipyards.co.ke -d kenyashipyards.co.ke
sudo certbot renew --dry-run
```

**Option B — Cloudflare Origin Certificate** (good when you want Full (strict) without exposing HTTP challenges): create under Cloudflare → SSL/TLS → Origin Server, install cert/key on the VPS, reference them in Nginx `ssl_certificate` / `ssl_certificate_key`.

**Expected:** Browser or `curl -vI https://www.kenyashipyards.co.ke/` shows a trusted chain (via Cloudflare) and origin accepts HTTPS.

**Verify:**

```sh
curl -sI https://www.kenyashipyards.co.ke/ | head -20
curl -sI https://www.kenyashipyards.co.ke/kwela/api/health
```

**Common mistakes:**

- Cloudflare **Full (strict)** while Nginx still has only HTTP → visitors see 525/526 errors.  
- Self-signed origin cert with **Full (strict)** → 526. Use Full (not strict) only as a temporary bridge, then fix.

---

### Step 7 — Choose Cloudflare SSL/TLS mode

**Goal:** Encrypt visitor ↔ Cloudflare and Cloudflare ↔ VPS correctly.  
**Where:** Cloudflare → SSL/TLS → Overview.

| Mode | Meaning | Use when |
|------|---------|----------|
| Off | No HTTPS at edge | Never for production |
| Flexible | HTTPS to visitor, **HTTP** to VPS | Temporary only if origin has no cert yet — can cause redirect loops |
| Full | HTTPS to VPS, allows self-signed origin | Short transition |
| Full (strict) | HTTPS to VPS with valid/trusted origin cert | **Recommended end state** |

**Recommended path:** Install origin cert (Step 6) → set **Full (strict)** → test.

**Verify:** HTTPS site loads; no redirect loop; portal login keeps session cookies.

**Common mistake:** Flexible + Nginx “redirect all HTTP to HTTPS” loops (visitor HTTPS → CF HTTP to origin → origin redirects to HTTPS → repeat).

---

### Step 8 — Update production environment variables

**Goal:** Build-time and runtime URLs match the real domain.  
**Where:** VPS files such as `/etc/ksl-portal.env` and/or `staff-portal/.env.production` (never commit secrets).

Example **target** values (no secrets shown):

```env
NEXT_PUBLIC_BASE_PATH=/kwela
NEXT_PUBLIC_PORTAL_URL=https://www.kenyashipyards.co.ke/kwela
NEXT_PUBLIC_SITE_URL=https://www.kenyashipyards.co.ke
PUBLIC_SITE_ORIGIN=https://www.kenyashipyards.co.ke,https://kenyashipyards.co.ke
TRUSTED_PROXY_HOPS=1
NODE_ENV=production
```

Keep `DATABASE_URL`, `STORAGE_DIR`, and the three `*_SECRET` values as already configured on the server. Do not paste them into tickets or git.

On your PC (for `portal-host.js` before publish), after DNS is decided:

```sh
# From a checkout of vps-postgres — only when preparing files; not run by this doc author
bash deploy/vps/fill-ip.sh --http 178.162.219.218   # current IP HTTP mode
# Later for domain HTTPS you must set portal-host.js / env to https://www.../kwela manually
# or extend fill-ip.sh; do not invent a domain IP for fill-ip.sh
```

**Critical:** Any change to `NEXT_PUBLIC_*` requires:

```sh
cd /path/to/staff-portal
# load env safely, then:
npm run build
sudo systemctl restart ksl-portal   # or bash deploy/vps/restart-portal.sh
```

Then republish static files so `js/portal-host.js` matches:

```sh
DEST=/var/www/kenyashipyards bash deploy/vps/publish-public.sh
```

**Verify:** View source / Network tab — public pages call `https://www.kenyashipyards.co.ke/kwela/api/public/...`.

**Common mistakes:**

- Changing env but forgetting rebuild (old URLs baked into JS).  
- Trailing slashes on origins.  
- Leaving `portal-host.js` on the HTTP IP after domain cutover.

---

### Step 9 — Auth, API, redirects, CORS

**Goal:** Login, public API, uploads, and contact form work on the new hostnames.  
**Where:** Code already mostly prepared; confirm Cloudflare + Turnstile + rebuild.

Checklist:

1. **CORS:** `middleware.ts` already allows `https://kenyashipyards.co.ke` and `www`. Ensure `PUBLIC_SITE_ORIGIN` includes the live public origins.  
2. **Portal path:** Browser calls must use `/kwela/api/...`, not bare `/api/...`.  
3. **Cookies:** Production sessions expect HTTPS (`secure` cookies). Prefer HTTPS before relying on staff sessions from the public domain.  
4. **Passkeys:** Tied to portal hostname / RP ID derived from `NEXT_PUBLIC_PORTAL_URL`. After domain change, staff may need to re-register passkeys.  
5. **Turnstile:** In Cloudflare Turnstile widget settings, allow `www.kenyashipyards.co.ke` (and apex if used). Set site key + secret in portal env, rebuild.  
6. **Redirects:** Apex → www (if you choose that); `/admin` → `/kwela` already in Nginx.

**Verify:**

```sh
curl -sS https://www.kenyashipyards.co.ke/kwela/api/health
curl -sS https://www.kenyashipyards.co.ke/kwela/api/public/news | head
# From a browser on the public site: DevTools → Network should show CORS success for /api/public/*
```

**Common mistakes:** Mixed content (HTTPS page calling `http://178.162...`); Turnstile domain mismatch; forgotten `NEXT_PUBLIC_BASE_PATH=/kwela`.

---

### Step 10 — Firewall and required ports

**Goal:** Only necessary ports are open.  
**Where:** VPS (`ufw` or HostPinnacle firewall panel).

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

**Do not open:** `3000`, `5432`, `3306`.

**Verify:**

```sh
sudo ss -tlnp | grep -E ':(80|443|3000|5432)\b'
```

Expect Nginx on 80/443; Node on `127.0.0.1:3000`; Postgres on `127.0.0.1:5432`.

**Common mistake:** Opening 3000 “to test” and leaving it open permanently.

---

### Step 11 — Restart / reload services safely

**Goal:** Apply config without taking unrelated services down.  
**Where:** VPS.

Preferred order:

```sh
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl restart ksl-portal
sudo systemctl status ksl-portal --no-pager
curl -sS http://127.0.0.1:3000/api/health
```

**Avoid:** `reboot` as a first resort; restarting MySQL/WordPress stacks; `systemctl stop postgresql` unless you intend downtime for the new portal too.

**Expected health:** `{"status":"ok","database":"up"}`.

---

### Step 12 — Test the new website thoroughly

**Goal:** Prove public site, portal, API, login, uploads, contact.  
**Where:** Browser + `curl`.

| Test | Expected |
|------|----------|
| `https://www.kenyashipyards.co.ke/` | New static site home |
| `/about.html`, `/news.html`, `/contact.html` | Pages render |
| Unknown path | Sensible 404 (branded if configured) |
| `/kwela/login` | Staff login |
| Password sign-in | Lands in portal |
| Edit + publish news | Public news updates via `/kwela/api/public/news` |
| Upload image | File under `STORAGE_DIR`; URL loads |
| Contact form | Succeeds with Turnstile; message in portal |
| `/kwela/api/health` | `ok` / database `up` |
| Hard refresh (Ctrl+Shift+R) | No stale cached JS |

Use [guides/POST-DEPLOY-AUDIT.md](./guides/POST-DEPLOY-AUDIT.md) and Stage 7 of [DEPLOYMENT.md](./DEPLOYMENT.md) as extended checklists.

---

### Step 13 — Verify the old website was not affected

**Goal:** Prove you did not damage WordPress / mail / other vhosts.  
**Where:** Cloudflare (if old host still has a hostname), VPS read-only checks, mail test.

| Check | How |
|-------|-----|
| Old site still reachable (if not yet cut over) | Open the pre-cutover URL/host; WordPress loads |
| After cutover, old files still on disk | `ls` the old document root — still present |
| MySQL (if used by WordPress) | Still running; you did not drop databases |
| Email | Send/receive using existing Outlook/M365 addresses |
| Other apps (e.g. osTicket) | Still open on their previous URLs |
| Nginx site list | WordPress site file still enabled if it was before |

If anything old is broken, **roll back DNS** in Cloudflare to the previous A record (from your Step 3 inventory) before troubleshooting the VPS.

---

### Step 14 — Troubleshooting common failures

| Symptom | Likely cause | What to try |
|---------|--------------|-------------|
| Dig still shows old IP (grey cloud) | TTL / wrong record edited | Re-check Cloudflare record name (`@` vs `www`); wait; flush local DNS |
| Dig shows CF IPs but site is wrong | Orange cloud origin still old server | Edit the A record **content** (origin) to `178.162.219.218` |
| Error 521 / 522 | Origin down or firewall blocking CF | VPS up? ufw allow 80/443? Nginx running? |
| Error 525 / 526 | SSL mode vs origin cert mismatch | Align Step 6 + Step 7 |
| Redirect loop | Flexible SSL + HTTPS redirect | Use Full/Full strict; fix origin cert |
| Public site OK, portal 404 | Missing `/kwela` location or wrong `basePath` | Compare live Nginx to `kenyashipyards-ip.conf`; rebuild with `NEXT_PUBLIC_BASE_PATH=/kwela` |
| Portal API fails CORS | Origin not allowed | Check `PUBLIC_SITE_ORIGIN` and HTTPS scheme |
| Login page loads then logs you out | Cookie `secure` on HTTP | Use HTTPS |
| Contact form fails | Turnstile domain / missing secrets | Add domain in Turnstile; set keys; rebuild |
| Uploads hang | Proxy buffering / body size | Confirm `client_max_body_size` and timeouts in `/kwela` location |
| Public content stale | `portal-host.js` still points at old host | Republish static site; hard refresh |
| `publish-public.sh` deleted unexpected files | Wrong `DEST` | Restore from backup; never point at WordPress root |

Useful log commands:

```sh
sudo journalctl -u ksl-portal -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/error.log
curl -sS http://127.0.0.1:3000/api/health
```

---

## 6. Pre-deployment checklist

Complete before changing Cloudflare website records:

- [ ] On branch `vps-postgres` only; `main` left untouched for this cutover  
- [ ] Screenshot / export of **all** Cloudflare DNS records (Step 3)  
- [ ] Confirmed MX/TXT for Microsoft 365 will stay unchanged  
- [ ] Confirmed old WordPress document root path (if on this VPS) and vowed not to use it as `DEST`  
- [ ] `http://178.162.219.218/` loads the new public site  
- [ ] `http://178.162.219.218/kwela/login` works; health API `database:up`  
- [ ] Portal rebuild plan ready for HTTPS domain URLs  
- [ ] Turnstile domains planned  
- [ ] Firewall: 22/80/443 only for web/SSH; 3000/5432 closed externally  
- [ ] Backup Postgres + `STORAGE_DIR` taken and stored off-box  
- [ ] Rollback plan: revert Cloudflare A record to previous origin within minutes  

---

## 7. Final verification checklist (after DNS cutover)

- [ ] `https://kenyashipyards.co.ke` and/or `https://www.kenyashipyards.co.ke` serve the **new** site  
- [ ] Apex behaviour matches plan (redirect to www or both serve site)  
- [ ] Portal login on `/kwela/login` over HTTPS  
- [ ] Public API news/settings/contact work from the public origin  
- [ ] Uploads and stored-file URLs work  
- [ ] Cloudflare SSL mode is Full (strict) or an intentional temporary Full  
- [ ] Cloudflare cache purged if old HTML appears  
- [ ] Email send/receive still works  
- [ ] Old WordPress files/DB still intact (even if no longer public)  
- [ ] `dig NS` still shows Cloudflare nameservers  

---

## 8. What We Need to Confirm Before Going Live

These items could **not** be fully verified from the repo + public lookups alone:

1. **Exact Cloudflare origin IP** currently behind the orange cloud for `kenyashipyards.co.ke` (public DNS only shows Cloudflare anycast IPs).  
2. **Whether WordPress/osTicket live on the same HostPinnacle VPS** as `178.162.219.218` or on a different server — VPS shell inventory required.  
3. **Safaricom registrar UI details** (account access, exact NS fields) — nameservers are Cloudflare, but registrar panel was not inspected.  
4. **Whether `www` should be created** — no `www` A/CNAME answer was found in dig; confirm intended public hostname.  
5. **Live Cloudflare SSL/TLS mode** currently selected (Flexible vs Full vs Full strict).  
6. **Whether Cloudflare proxy + bot fight / challenge** will block normal browsers after cutover (this environment hit a challenge page).  
7. **On-server paths in production today** — scripts support both `/opt/kenyashipyards/admin-api` + `/var/www/kenyashipyards` and `/opt/ksl-website` + `/var/www/ksl`; confirm which pair is live.  
8. **systemd vs any leftover PM2** — templates use systemd; confirm `systemctl status ksl-portal`.  
9. **MySQL** still present from Stage 1 notes — confirm it remains unused by the new portal and untouched.  
10. **Turnstile production keys** and allowed hostnames.  
11. **Content completeness** — health can be `ok` while CMS tables are still thin; confirm content import gate in `POST-DEPLOY-AUDIT.md` before public launch.  
12. **Passkey / WebAuthn** plan after moving from IP HTTP to HTTPS domain.  
13. **Internal scrape IP `10.104.4.139`** — historical WordPress reference only; confirm it is not still the Cloudflare origin.  
14. **HostPinnacle panel firewall** rules in addition to `ufw` (provider-level filters).  
15. **Who approves DNS cutover** and the maintenance window for rolling back if needed.

---

## 9. Document control

| Field | Value |
|-------|--------|
| Created | 20 Nov 2026 |
| Branch | `vps-postgres` |
| Scope | Documentation only — no live DNS/VPS changes performed while writing |
| VPS IP referenced | `178.162.219.218` |
| Domain referenced | `kenyashipyards.co.ke` |

If deployment scripts or Nginx templates change, update Sections 2 and 5 of this guide in the same pull request on `vps-postgres`.

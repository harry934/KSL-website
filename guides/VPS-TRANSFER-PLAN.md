# Transfer the KSL website to an Ubuntu VPS

**Audience:** whoever is moving this site off Vercel onto one Linux server.  
**Last updated:** 11 November 2026  

**Follow this document for the move.** The older runbook in [PRODUCTION-OVERVIEW-AND-VPS.md](./PRODUCTION-OVERVIEW-AND-VPS.md) is still useful background, but its Nginx example serves the git clone as the website. Do not do that. Use the folder layout in this guide.

**Also use:** [VPS-MIGRATION-CHECKLIST.md](./VPS-MIGRATION-CHECKLIST.md) while testing · [DEPLOYMENT.md](./DEPLOYMENT.md) for how the site works on Vercel today.

Do the work in the order below. Do not point `www.kenyashipyards.co.ke` at the VPS until section 10 passes.

---

## What moves, and what stays

The repository is two applications plus a cloud database.

| Piece | Today | On the VPS |
|-------|--------|------------|
| Public website | Vercel `ksl-website` → https://ksl-website.vercel.app | Nginx serves static files at `https://www.kenyashipyards.co.ke` |
| Staff portal | Vercel `ksl-website_kiza` → https://ksl-websitekiza.vercel.app | Next.js on the same VPS, private hostname, port 3000 on loopback only |
| Database, staff accounts, uploaded files | Supabase project `envqgczfhxywkxcnsxrt` | **Stays on Supabase.** Do not install Postgres for this project. |

A visitor loads HTML from Nginx. JavaScript on the page then calls the portal at `/api/public/...` for live content. If that call fails, the page uses the snapshot in `data/*.json`. The public site never holds the Supabase service role key.

```text
Browser
  │
  ├─ HTML, CSS, JS, images  →  Nginx  →  /var/www/ksl
  │
  └─ /api/public/*          →  Nginx  →  127.0.0.1:3000  →  Next.js portal
                                                              │
                                                              └─ Supabase (Postgres, Auth, Storage)
```

---

## Decisions to make first

Write these down before touching the server. Later steps use the same names.

| Decision | What to choose |
|----------|----------------|
| OS | Ubuntu **24.04 LTS**. 22.04 LTS is acceptable. |
| Size | **2 vCPU, 4 GB RAM**, 40 GB disk. A 2 GB machine needs a 2 GB swap file before the portal build. |
| Region | Europe, close to the Supabase database in `eu-west-1`. |
| Public names | `www.kenyashipyards.co.ke` for the site. `kenyashipyards.co.ke` redirects to `www`. |
| Portal name | An unguessable hostname, for example `ksl-staff-7k3m.kenyashipyards.co.ke`. Do **not** use `admin.kenyashipyards.co.ke`, and do not link it from the public menu or sitemap. Staff bookmark `https://PORTAL_HOST/login`. |
| Staging name | A hostname used only for the dress rehearsal, for example `staging.kenyashipyards.co.ke`. |
| SSH | Key login for a sudo user. A separate `deploy` user runs the app. The app does not run as root. |

Replacing `PORTAL_HOST` below means that hostname with no `https://` and no trailing slash. Example: `ksl-staff-7k3m.kenyashipyards.co.ke`.

Passkeys registered on `ksl-websitekiza.vercel.app` will not work on the new portal hostname. Username and password still work. Each person who uses a passkey registers it again after the move. In Supabase, set the WebAuthn relying party ID to `PORTAL_HOST` with no leading dot.

---

## 1. Information to collect

From the Vercel project **`ksl-website_kiza`** (staff portal), copy the environment values into a password manager. Put them on the server in section 5. Do not commit them, and do not send the service role key in chat or email.

You need:

- `NEXT_PUBLIC_SUPABASE_URL` — `https://envqgczfhxywkxcnsxrt.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `MESSAGE_VIEW_UNLOCK_SECRET` or `SUPABASE_JWT_SECRET` (message unlock fails if both are missing)

Also confirm:

- You can create DNS records for `kenyashipyards.co.ke`.
- Supabase → Authentication → Email has **public sign-ups turned off**.
- Migrations **`001` through `041`** are applied. The older notes stop at `039`. `040` and `041` add the contact-message IP and risk columns. Do not import `data/*.json` again unless a table is empty.

---

## 2. Prepare Ubuntu

Log in with your sudo user. Commands that change the system use `sudo`. Commands that build the app later run as `deploy`.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx git ufw fail2ban
```

Install **Node.js 22 LTS** for the whole system. The portal is Next.js 15.5.29. Do not use the Node package that Ubuntu ships.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
sudo npm install -g pm2
```

`node -v` must print v22.x.

Create the app user and the two directories. `/srv/ksl` is private. `/var/www/ksl` is the only folder Nginx will serve for the public site.

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy
sudo mkdir -p /srv/ksl /var/www/ksl
sudo chown deploy:deploy /srv/ksl /var/www/ksl
```

Give `deploy` the same SSH key you use, then open a **second** terminal and confirm `deploy` can log in before you continue. After that, in `/etc/ssh/sshd_config`:

```text
PasswordAuthentication no
PermitRootLogin no
```

Reload SSH (`sudo systemctl reload ssh`). Keep the working terminal open until the new login succeeds.

Firewall. Port 3000 stays closed. Only Nginx on this machine talks to the portal.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

On a 2 GB VPS, add swap before the first build:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. DNS, without cutting over www yet

Lower the TTL on the existing records to 300 seconds at least a day before the real cutover.

Create these **A** records (and **AAAA** if the VPS has IPv6), all pointing at the VPS:

| Name | When it may point at the VPS |
|------|-------------------------------|
| `staging.kenyashipyards.co.ke` | Now. Used for the dress rehearsal. |
| `PORTAL_HOST` | Now. Nobody should know this name, so it can go live early. |
| `www.kenyashipyards.co.ke` | **Last.** This is the public cutover. |
| `kenyashipyards.co.ke` (apex) | Same moment as `www`. Nginx redirects it to `www`. |

Let's Encrypt can only issue a certificate for a name that already points at this server (HTTP check), unless you use a DNS challenge. That is why `www` waits.

---

## 4. Put the code on the server

As `deploy`:

```bash
git clone https://github.com/harry934/KSL-website.git /srv/ksl/repo
```

If the GitHub repo is private, use a read-only deploy key. Do not put GitHub passwords on the server.

The clone stays in `/srv/ksl/repo`. Nginx never uses that path as its document root. A document root on the clone would publish `.git`, `staff-portal/.env.production`, `guides/` (including the security notes), `supabase/`, and `tools/`.

---

## 5. Portal environment file

As `deploy`:

```bash
install -m 600 /dev/null /srv/ksl/repo/staff-portal/.env.production
nano /srv/ksl/repo/staff-portal/.env.production
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://envqgczfhxywkxcnsxrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste-anon-key
SUPABASE_SERVICE_ROLE_KEY=paste-service-role-key
NEXT_PUBLIC_PORTAL_URL=https://PORTAL_HOST
NEXT_PUBLIC_SITE_URL=https://www.kenyashipyards.co.ke
NEXT_PUBLIC_TURNSTILE_SITE_KEY=paste-site-key
TURNSTILE_SECRET_KEY=paste-secret-key
MESSAGE_VIEW_UNLOCK_SECRET=paste-long-random-secret
TRUSTED_PROXY_HOPS=1
NODE_ENV=production
```

Rules:

- No quotes, no spaces around `=`, no trailing slash on the URLs.
- `TRUSTED_PROXY_HOPS=1` is required. Behind Nginx, sign-in lockouts use it to read the visitor IP. Without it, a caller can spoof `X-Forwarded-For`.
- `MESSAGE_VIEW_UNLOCK_SECRET` can be any long random string generated on the server (`openssl rand -base64 32`). `SUPABASE_JWT_SECRET` may be used instead. One of them must be set or opening a contact message throws.
- `NEXT_PUBLIC_*` values are copied into the JavaScript **at build time**. Change the file, then build again. Editing the file after `npm run build` does not update those public values.
- The static website has no environment file.

```bash
chmod 600 /srv/ksl/repo/staff-portal/.env.production
```

---

## 6. Build the portal and keep it running

As `deploy`:

```bash
cd /srv/ksl/repo/staff-portal
npm ci
npm run build
pm2 start npm --name ksl-portal --cwd /srv/ksl/repo/staff-portal -- start
pm2 save
pm2 startup
```

`pm2 startup` prints a `sudo` command. Run that command so the portal comes back after a reboot.

Check that Node is listening on loopback only, and that login responds:

```bash
ss -tlnp | grep 3000
curl -sI http://127.0.0.1:3000/login
```

The address in `ss` must be `127.0.0.1:3000`, not `0.0.0.0:3000`.

`next start` loads `.env.production` when `NODE_ENV` is `production`.

---

## 7. Publish only the public files

Create `/srv/ksl/publish-public.sh` as `deploy`:

```bash
#!/bin/bash
set -euo pipefail
rsync -a --delete \
  --include='*.html' \
  --include='css/***' \
  --include='js/***' \
  --include='lib/***' \
  --include='img/***' \
  --include='docs/***' \
  --include='data/***' \
  --exclude='*' \
  /srv/ksl/repo/ /var/www/ksl/
```

```bash
chmod 750 /srv/ksl/publish-public.sh
/srv/ksl/publish-public.sh
```

That copies the 18 public HTML pages plus `css/`, `js/`, `lib/`, `img/`, `docs/`, and `data/`. It does not copy `staff-portal/`, `guides/`, `supabase/`, `tools/`, or `.git`.

Confirm the web root looks like a website and nothing else:

```bash
find /var/www/ksl -maxdepth 2 -type d
test ! -d /var/www/ksl/staff-portal
test ! -d /var/www/ksl/.git
```

---

## 8. Point the public pages at the new portal

Every public HTML file has this on the `<html>` tag:

```html
data-ksl-content-api="https://ksl-websitekiza.vercel.app"
```

Change it to `https://PORTAL_HOST` (no trailing slash) on all of these files, in the git clone, then run `/srv/ksl/publish-public.sh` again:

`index.html`, `about.html`, `organization.html`, `board.html`, `service.html`, `products.html`, `project.html`, `sustainability.html`, `csr.html`, `careers.html`, `news.html`, `article.html`, `event.html`, `faq.html`, `downloads.html`, `videos.html`, `contact.html`, `404.html`.

`js/ksl-content.js` reads that attribute. If it still names the Vercel portal, the new site will keep loading content from Vercel.

Do this in git on your workstation, commit it, and `git pull` on the server, so the next deploy does not overwrite it. Until `www` is cut over, the Vercel site can keep the old value. The files on the VPS must use `PORTAL_HOST`.

CORS in `staff-portal/src/middleware.ts` already allows:

- `https://www.kenyashipyards.co.ke`
- `https://kenyashipyards.co.ke`
- `https://ksl-website.vercel.app` and its preview hosts
- localhost, for development

Leave the Vercel origin in that list until the cutover has been quiet for a few days. Then remove it.

In the Cloudflare Turnstile dashboard, add `www.kenyashipyards.co.ke` to the widget's allowed hostnames. Add `staging.kenyashipyards.co.ke` as well if you submit the contact form during the dress rehearsal.

---

## 9. Nginx and certificates

Replace `PORTAL_HOST` and, for the rehearsal, `staging.kenyashipyards.co.ke` if you use it.

### Public site

`/etc/nginx/sites-available/ksl-public`:

```nginx
# Apex → www. Enable this server block when the apex DNS record points here.
server {
    listen 80;
    listen [::]:80;
    server_name kenyashipyards.co.ke;
    return 301 https://www.kenyashipyards.co.ke$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name www.kenyashipyards.co.ke staging.kenyashipyards.co.ke;

    root /var/www/ksl;
    index index.html;

    # Branded 404, including nested paths such as /foo/bar/missing.
    # 404.html has <base href="/"> so its CSS still loads.
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    location ~* ^/img/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(mp4|webm)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /docs/ {
        expires 7d;
    }

    # Same policy as vercel.json. PORTAL_HOST is the live portal.
    # Keep the Vercel hosts until cutover is finished, then delete those two.
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://PORTAL_HOST https://ksl-websitekiza.vercel.app https://ksl-website.vercel.app https://www.kenyashipyards.co.ke https://kenyashipyards.co.ke https://*.supabase.co https://translate.googleapis.com https://translate.google.com https://challenges.cloudflare.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://translate.google.com https://challenges.cloudflare.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" always;
}
```

During the rehearsal, `server_name` can be only `staging.kenyashipyards.co.ke`. Add `www` and the apex block when those DNS records move.

`add_header` on a location replaces inherited `add_header` lines. The `/img/`, video, and `/docs/` blocks above set cache headers only. If you need the security headers on those files too, repeat the `add_header` lines inside those locations, or set the security headers with a `map` / included snippet that every location adds. Check a CSS and an image response after Certbot, not only the home page.

### Staff portal

`/etc/nginx/sites-available/ksl-portal`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name PORTAL_HOST;

    # Videos are allowed up to 50 MB, documents up to 25 MB.
    client_max_body_size 55m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

The portal process adds its own security headers and `X-Robots-Tag: noindex`. Do not add a second, conflicting Content-Security-Policy in this file.

### Enable and request certificates

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/ksl-public /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/ksl-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Request certificates only for names whose DNS already points at this VPS:

```bash
sudo certbot --nginx -d staging.kenyashipyards.co.ke
sudo certbot --nginx -d PORTAL_HOST
sudo certbot renew --dry-run
```

When `www` and the apex move, run:

```bash
sudo certbot --nginx -d www.kenyashipyards.co.ke -d kenyashipyards.co.ke
```

Certbot installs a systemd timer for renewal. `certbot renew --dry-run` must succeed before cutover.

---

## 10. Dress rehearsal

On your own computer, you can also map a name to the VPS without changing public DNS. That does **not** get you a Let's Encrypt certificate. Prefer the real `staging` and `PORTAL_HOST` names from section 3.

Work through [VPS-MIGRATION-CHECKLIST.md](./VPS-MIGRATION-CHECKLIST.md). The minimum bar:

| Check | Pass looks like |
|-------|-----------------|
| `https://PORTAL_HOST/login` | Sign-in page over a valid certificate. Not a Vercel access wall. |
| `curl -s https://PORTAL_HOST/api/public/news` | JSON, not an Nginx error. |
| Staging home page | News and events fill in. Browser console has no Content-Security-Policy errors. |
| `/this-page-does-not-exist` | HTTP 404 and the branded page. |
| `/foo/bar/missing` | Same branded page, with CSS loaded. |
| `article.html?slug=not-a-real-slug` | In-page "couldn't find that story". It does not jump to `404.html`. |
| Staff edit | Publish a small news change. The public page shows it within about a minute. |
| Contact form | Turnstile shows, submit succeeds, the row appears in portal Messages. |
| Gallery upload | File lands in Supabase Storage and shows on the gallery page. |
| Hidden paths | `https://staging.../staff-portal/.env.production` and `https://staging.../guides/` are both 404. |
| Reboot | `sudo reboot`, then `pm2 status` shows `ksl-portal` online, and login still answers. |

Sign in, publish, and upload using a real staff account. A page that merely renders is not enough.

---

## 11. Cut over www

1. On the VPS, `git pull`, run `/srv/ksl/publish-public.sh`, and confirm `data-ksl-content-api` is `https://PORTAL_HOST`.
2. Rebuild if any portal env or portal code changed: `cd /srv/ksl/repo/staff-portal && npm ci && npm run build && pm2 reload ksl-portal`.
3. Add `www.kenyashipyards.co.ke` to the public `server_name`, and enable the apex redirect block. `sudo nginx -t && sudo systemctl reload nginx`.
4. Point the `www` and apex A/AAAA records at the VPS.
5. As soon as DNS answers from the VPS, `sudo certbot --nginx -d www.kenyashipyards.co.ke -d kenyashipyards.co.ke`.
6. Repeat the checklist against `https://www.kenyashipyards.co.ke`.
7. Watch for a day: `sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log` and `pm2 logs ksl-portal`.

Leave both Vercel projects running. They are the rollback.

In Supabase, set the passkey relying party ID to `PORTAL_HOST`. Tell staff that old passkeys will not work and that password sign-in will.

The portal status cards still name `ksl-website.vercel.app` and `ksl-websitekiza.vercel.app` (`staff-portal/src/components/portal/service-status.tsx` and `staff-portal/src/app/api/admin/status/route.ts`). Update those to the real hosts after the hostname is final, then rebuild.

---

## 12. If you need to go back

1. Point `www` and the apex A/AAAA records back at Vercel.
2. The public pages on Vercel must use `data-ksl-content-api="https://ksl-websitekiza.vercel.app"`.
3. Supabase is shared. Content edited on the VPS is already in the same database, so you do not restore a database to roll the website back.

---

## 13. Updates after go-live

As `deploy`:

```bash
cd /srv/ksl/repo
git pull
/srv/ksl/publish-public.sh
cd staff-portal
npm ci
npm run build
pm2 reload ksl-portal
```

HTML, CSS, JS, and images are live as soon as `publish-public.sh` finishes. Portal changes need the build and `pm2 reload`.

Backups:

- Database and uploaded media: Supabase backups. They are not on this disk.
- Server: the provider's snapshot. The file that must not be lost locally is `staff-portal/.env.production`.

Take a snapshot before each portal upgrade.

---

## 14. Security list before calling it done

- [ ] `.env.production` is mode `600`, owner `deploy`, and is not under `/var/www`.
- [ ] Port 3000 is not reachable from the internet (`ss` shows `127.0.0.1` only, `ufw status` has no 3000).
- [ ] SSH password login is off.
- [ ] Public sign-up is off in Supabase. Staff are invite-only.
- [ ] The service role key exists only in the portal env file.
- [ ] `TRUSTED_PROXY_HOPS=1`.
- [ ] Turnstile is on, and `www.kenyashipyards.co.ke` is an allowed hostname.
- [ ] The portal hostname is not in the public menu, footer, or sitemap.
- [ ] `certbot renew --dry-run` succeeds.
- [ ] `pm2` brings the portal back after a reboot.
- [ ] Vercel origins removed from Nginx `connect-src` and from `ALLOWED_ORIGINS` once you no longer need them.

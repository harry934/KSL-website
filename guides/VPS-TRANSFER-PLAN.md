# Move this project from Vercel to your VPS

> **Superseded for the `vps-postgres` branch:** this historical plan assumes Supabase Auth, Supabase Storage, and Vercel production settings. Do not follow its data/password-hash instructions. Use [the standalone PostgreSQL and VPS operations guide](../postgres/README.md) instead.

**Last updated:** 12 November 2026

You SSH in from your own computer and copy this project onto an Ubuntu server. The server replaces Vercel and it replaces Supabase. GitHub stays the place the code is stored.

There is no `kenyashipyards.co.ke` website to move. The live addresses today are the two Vercel links below. Until you buy a domain, visitors use the VPS IP address.

These pieces are already prepared on the computer that holds this repository:

| Already done | Where | What you still do |
|--------------|--------|-------------------|
| Env file, with the Supabase URL, the anon key, and the Turnstile site key filled from Vercel | `staff-portal/.env.production` (not in git) | Paste three secrets Vercel will not export, then run `bash deploy/vps/fill-ip.sh YOUR_IP` |
| Blank template of that file | `staff-portal/.env.example` | Nothing, unless the real file is lost |
| One switch for the portal address | `js/portal-host.js` | `fill-ip.sh` writes it. Leave it empty until you have the IP. |
| Public-site copy command | `deploy/vps/publish-public.sh` | Run it on the server |
| Nginx site files | `deploy/vps/nginx/` | Copy them into `/etc/nginx` and replace `VPS_IP` |
| CORS for whatever address you set | `PUBLIC_SITE_ORIGIN` in the env file, read by `middleware.ts` | Set it with `fill-ip.sh`, then build on the server |

The three lines that stay empty until you paste them from the Vercel project `ksl-website_kiza` are `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, and `SUPABASE_JWT_SECRET`. Vercel stores those as secrets and will not send them to this computer.

---

## Where each part lives today

| Part | Where it is now | What you do |
|------|-----------------|-------------|
| Public website | Vercel project `ksl-website` → https://ksl-website.vercel.app | Move it. Nginx on the VPS serves the HTML files. |
| Staff portal | Vercel project `ksl-website_kiza` → https://ksl-websitekiza.vercel.app/login | Move it. Node.js on the VPS runs this app. |
| Code | GitHub → https://github.com/harry934/KSL-website | Leave it. The VPS downloads the code from GitHub with `git clone`. |
| Database | Supabase project `envqgczfhxywkxcnsxrt` | Copy the whole database onto Postgres on the VPS, then leave Supabase. |
| Staff login | Supabase Authentication | Copy each password hash with the database. The portal on the VPS checks it. |
| Photos and documents uploaded in the portal | Supabase Storage | Copy the files onto the VPS disk. Nginx serves them. |

```text
Your computer
    SSH  →  Ubuntu VPS
                │
                ├─ Nginx serves the public HTML and the uploaded files
                ├─ Postgres holds the whole database, on this server only
                └─ Node serves the staff portal and checks passwords itself

GitHub is only where the code is stored.
Supabase is emptied after the VPS copy has been checked, then closed.
```

After the move, Vercel can stay up until you are sure the VPS works. Pointing people at the VPS is a separate step.

## Leave Supabase

Supabase Cloud is the part that runs out of download allowance, and the portal cannot keep calling it. The copy has to include three things or staff cannot sign in and the photos disappear:

1. **Every table.** Postgres on the VPS, listening only on `127.0.0.1`. Restore a full dump of project `envqgczfhxywkxcnsxrt`, including `public` and `auth.users`. `admin_profiles.id` matches `auth.users.id`, so those ids have to stay the same.
2. **Passwords.** They live in `auth.users.encrypted_password`, not in the staff profile. Copy that hash onto the profile and make `/api/auth/sign-in` check it on the VPS. Staff keep the same username and password. Invites still create the account. Public sign-up stays closed.
3. **Files.** Download the `media-public`, `downloads`, and `avatars` buckets onto the VPS disk. Rewrite every stored link that still says `supabase.co` so the public site loads the VPS copy.

The portal code today uses the Supabase client for all three. That client is removed as part of this move. Postgres is reached with a normal database connection string, `DATABASE_URL`, which stays in the server env file and is never put in the HTML.

Do the trial on the VPS while the live portal still uses Supabase. Switch the portal only after this passes:

- A current staff username and password signs in. The session cookie is HTTPS-only and ends after 20 minutes away.
- A new account can still be created only from an invite.
- Publishing a news item and hiding a gallery photo change the public site.
- A photo, a document, and an account picture open from the VPS address, with no request to `supabase.co`.
- From outside the server, port 5432 is closed. Only 22, 80, 443, and 8443 answer.
- A backup restored onto a second database brings one deleted row back.

Then point the portal at `DATABASE_URL`, keep the Supabase project read-only for a few days, and close it. MySaas is a different project in the same Supabase organisation. Closing the Kenya Shipyards project does not delete MySaas. MySaas keeps using that organisation's allowance until it is moved on its own.

---

## What you will open in a browser

One IP, two ports. The portal cannot share the public site's address, because both want paths like `/news`.

| What | Address | Port |
|------|---------|------|
| Public website | `https://VPS_IP/` | 443 |
| Staff portal | `https://VPS_IP:8443/login` | 8443 |

Replace `VPS_IP` with the real address, for example `https://203.0.113.10/`.

A certificate from Let's Encrypt needs a domain name. A bare IP cannot get one here. The steps below create a certificate on the server itself. The browser will warn the first time. You choose to continue. Staff login needs that HTTPS. On plain HTTP the sign-in cookie is refused, so the login page would load and then forget you.

When you later have a domain, you swap this certificate for a normal one and change the two addresses. Supabase does not change.

The contact form's Cloudflare Turnstile check is registered for hostnames, not for a raw IP. The rest of the site works on the IP. The contact widget may not, until a domain is added.

Passkeys are tied to `ksl-websitekiza.vercel.app`. On the IP, sign in with username and password.

---

## What the code does

### Public pages

These files sit at the root of the repository. The file name is the page address. `about.html` is the About page. Nginx serves them as files. They do not run on Node, and they do not contain the database password.

| File | Page |
|------|------|
| `index.html` | Home |
| `about.html` | About |
| `organization.html` | Organisation |
| `board.html` | Board of directors |
| `service.html` | Services |
| `products.html` | Products |
| `project.html` | Projects |
| `sustainability.html` | Sustainability |
| `csr.html` | Community |
| `careers.html` | Careers |
| `news.html` | News list |
| `article.html` | One news story |
| `event.html` | Events |
| `faq.html` | Questions |
| `downloads.html` | Downloads |
| `videos.html` | Gallery |
| `contact.html` | Contact |
| `404.html` | Page not found |

Each of those files has this on the `<html>` tag:

```html
data-ksl-content-api="https://ksl-websitekiza.vercel.app"
```

That is the staff portal's address. The page loads, then JavaScript asks that address for the latest news, jobs, and so on. You do not edit all 18 pages for the move. `js/portal-host.js` runs first. While `var origin` is empty, the pages keep using the Vercel address. When you set that one line to `https://VPS_IP:8443`, every page follows it. `bash deploy/vps/fill-ip.sh` writes the line.

`css/` is the look of the site. `img/` and `docs/` are the pictures, video, and downloadable files shipped with the site. `data/*.json` is a saved copy of the content, used only when the portal cannot be reached. `lib/` is third-party code (jQuery, Bootstrap, the carousel). Do not edit `lib/`.

`guides/`, `staff-portal/`, `supabase/`, and `tools/` must not be placed in the public folder. `guides/` includes security notes. `staff-portal/` will hold the secret keys.

### Shared scripts (`js/`)

`js/scripts.js` loads the scripts below, then the one script that belongs to the page you are on.

| File | What it does |
|------|----------------|
| `js/portal-host.js` | If `var origin` is set, it replaces `data-ksl-content-api` before the other scripts run. Empty means "keep the Vercel address". |
| `js/ksl-content.js` | `apiBase()` reads `data-ksl-content-api`. `fetchJson()` asks the portal for JSON. If that fails, it reads `data/*.json`. |
| `js/ksl-live.js` | Starts those requests while the page is still loading, and keeps the saved copy hidden until the live copy arrives. |
| `js/gallery-live.js` | Fills the gallery as soon as the portal answers. |
| `js/site-settings.js` | Puts the banner, phone numbers, and footer text from the portal onto every page. |
| `js/site-images.js` | Swaps a photo when staff have replaced it in the portal. If that fails, the original file stays. |
| `js/sanitize.js` | Cleans story text from the portal before it is shown, so visitors are not served raw HTML. |
| `js/input-guard.js` | Blocks code-like text in the search box and the contact form. |
| `js/main.js` | Menu, search, counters, and scroll effects on every page. Sends the contact form to the portal. |
| `js/mobile-nav.js` | The menu shown on a phone. |
| `js/lang.js` | English and Kiswahili switch. |
| `js/access.js` | Text size, contrast, and motion choices, remembered in this browser. |
| `js/intro-boot.js` | Hides the home page before paint so the opening logo can play. |
| `js/intro.js` | The opening logo on the home page. |
| `js/blocked-boot.js` | On the 404 page, shows the "that text was blocked" message when the contact form rejected the input. |
| `js/event-countdown.js` | Countdown on event cards. Times are East Africa Time. |
| `js/doodles.js` | Small decorations. |

### One script per page (`js/pages/`)

Each of these asks the portal for its own content and draws it into the HTML.

| File | What it draws |
|------|----------------|
| `js/pages/home.js` | Home sections |
| `js/pages/about.js` | The story, the values, and the path graphic |
| `js/pages/organization.js` | Intro, leadership, and the structure chart |
| `js/pages/board.js` | Board of directors |
| `js/pages/services.js` | Service cards, opened in a detail dialog |
| `js/pages/products.js` | Products |
| `js/pages/projects.js` | Project cards |
| `js/pages/news.js` | News list |
| `js/pages/article.js` | One news story. A missing story shows a message on this page. It does not use `404.html`. |
| `js/pages/event.js` | Events list. A missing event stays on this page too. |
| `js/pages/faq.js` | Questions and answers |
| `js/pages/careers.js` | Jobs and internships |
| `js/pages/downloads.js` | Documents visitors can download |
| `js/pages/csr.js` | Community programmes |

The gallery page uses `js/gallery-live.js` rather than a file in `js/pages/`.

### Staff portal

Folder: `staff-portal/`. This is a Next.js application. `npm run build` prepares it. `npm start` runs it. Nginx forwards `https://VPS_IP:8443` to that process on `127.0.0.1:3000`. Port 3000 is not opened to the internet.

The portal does not have its own user database. Sign-in works like this:

1. The person submits a username and password to `/api/auth/sign-in`.
2. The server asks Supabase Authentication if that password is correct.
3. If it is, the server sets a cookie named `ksl_staff_session`.
4. `judgeSession()` in `staff-portal/src/lib/staff-session.ts` accepts the cookie only when it matches the row in Supabase and the person has used the portal within the last 20 minutes.
5. `sessionCookieOptions()` marks the cookie `secure` in production, which is why the portal must be HTTPS.

`createAdminClient()` in `staff-portal/src/lib/supabase/admin.ts` opens the Supabase connection with `SUPABASE_SERVICE_ROLE_KEY`. That key stays in the env file on the VPS. It is never written into the HTML.

`staff-portal/src/middleware.ts` runs before every portal request. For `/api/public/*` it allows the public website to read data (CORS). For every other page it demands the staff cookie. `ALLOWED_ORIGINS` lists the Vercel site. `PUBLIC_SITE_ORIGIN` in the env file adds the VPS address, so you do not edit this file on the server.

Portal screens, one page each:

| Address | File | What it is |
|---------|------|------------|
| `/login` | `src/app/login/page.tsx` | Sign-in |
| `/signup` and `/i/[token]` | `src/app/signup/page.tsx`, `src/app/i/[token]/page.tsx` | A staff invite link |
| `/` | `src/app/(portal)/page.tsx` | Home after sign-in |
| `/news` | `.../news/page.tsx` | News editor |
| `/events` | `.../events/page.tsx` | Events editor |
| `/gallery` | `.../gallery/page.tsx` | Photos and videos |
| `/press` | `.../press/page.tsx` | Press kit |
| `/services` | `.../services/page.tsx` | Services |
| `/products` | `.../products/page.tsx` | Products |
| `/projects` | `.../projects/page.tsx` | Projects |
| `/organization` | `.../organization/page.tsx` | Organisation chart |
| `/board` | `.../board/page.tsx` | Board |
| `/careers` | `.../careers/page.tsx` | Jobs |
| `/csr` | `.../csr/page.tsx` | Community |
| `/faq` | `.../faq/page.tsx` | Questions |
| `/downloads` | `.../downloads/page.tsx` | Downloads |
| `/messages` | `.../messages/page.tsx` | Contact-form inbox |
| `/staff` | `.../staff/page.tsx` | Staff accounts and invites |
| `/settings` | `.../settings/page.tsx` | Site settings |
| `/banner` | `.../banner/page.tsx` | The strip under the menu |
| `/images` | `.../images/page.tsx` | Photos used across the site |
| `/files` | `.../files/page.tsx` | Spare uploaded files |
| `/drafts` | `.../drafts/page.tsx` | Items not yet on the website |
| `/recycle` | `.../recycle/page.tsx` | Deleted items |
| `/activity` | `.../activity/page.tsx` | Who changed what |
| `/account` | `.../account/page.tsx` | Your own profile and password |

The public API is read-only. The visitor's browser calls these. They return only published rows from Supabase.

| Route file | What the browser gets |
|------------|------------------------|
| `api/public/news/route.ts` | News |
| `api/public/events/route.ts` | Events |
| `api/public/gallery/route.ts` | Gallery |
| `api/public/services/route.ts` | Services |
| `api/public/products/route.ts` | Products |
| `api/public/projects/route.ts` | Projects |
| `api/public/careers/route.ts` | Jobs |
| `api/public/faq/route.ts` | Questions |
| `api/public/csr/route.ts` | Community |
| `api/public/downloads/route.ts` | Downloads |
| `api/public/organization/route.ts` | Organisation and board |
| `api/public/press/route.ts` | Press kit |
| `api/public/settings/route.ts` | Banner and contact details |
| `api/public/site-images/route.ts` | Replaced photos |
| `api/public/contact/route.ts` | Accepts the contact form (this one is a POST) |
| `api/public/contact-token/route.ts` | Gives the page the Turnstile site key |

Staff routes, after sign-in. Each `route.ts` reads or writes the matching Supabase table. The matching screen above calls it.

| Route | What it does |
|-------|----------------|
| `api/auth/sign-in` | Checks the password with Supabase, then sets the cookie |
| `api/auth/sign-out` | Clears the cookie |
| `api/auth/session` | Says whether the cookie is still valid |
| `api/auth/pulse` | Updates the "last seen" time so an open tab is not signed out at 20 minutes |
| `api/auth/forgot-password` | Starts a password reset through Supabase |
| `api/auth/passkey` | Passkey sign-in, still tied to the old Vercel hostname |
| `api/auth/invite/verify`, `invite/complete`, `invite/username-check` | Checks an invite and creates the Supabase user |
| `api/news`, `events`, `gallery`, `services`, `products`, `projects`, `careers`, `faq`, `csr`, `downloads`, `press`, `organization` | Save that section |
| `api/organization/photos` | Photos on the organisation page |
| `api/site-settings`, `api/site-images` | Banner, contact details, site-wide photos |
| `api/messages`, `api/messages/unlock` | Read the inbox. Unlock needs `MESSAGE_VIEW_UNLOCK_SECRET` |
| `api/staff`, `api/staff/invites`, `api/staff/requests` | Create staff, invites, and account requests |
| `api/upload` | Sends a file to Supabase Storage. Images up to 8 MB, documents up to 25 MB, video up to 50 MB |
| `api/account`, `account/password`, `account/avatar`, `account/passkey` | The signed-in person's own account |
| `api/drafts` | Items waiting for someone who is allowed to publish |
| `api/recycle` | Restore or remove deleted items |
| `api/search` | Search inside the portal |
| `api/notifications` | The bell for changes by other staff |
| `api/activity/export` | Download the activity log |
| `api/storage/spare`, `api/stored-file`, `api/gallery/file` | Fetch a stored file back from Supabase |
| `api/admin/status` | The status cards on the portal home |

`supabase/migrations/` is the history of the database shape, files `001` through `042`. They already ran on Supabase. The VPS copy is a restore of that database, then Postgres is installed on the VPS and is not reachable from the internet.

---

## Secrets the portal needs

Copy these from the Vercel project **`ksl-website_kiza`**, Settings → Environment Variables, for the trial period while the live portal still reads Supabase. After the cutover, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are removed and replaced by `DATABASE_URL`.

| Name | What it is |
|------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | The Supabase address, `https://envqgczfhxywkxcnsxrt.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The public Supabase key. Safe for the browser. It cannot bypass login. |
| `SUPABASE_SERVICE_ROLE_KEY` | The private Supabase key. Server only. This is how the portal writes content. |
| `NEXT_PUBLIC_PORTAL_URL` | `https://VPS_IP:8443` so invite links use the VPS |
| `NEXT_PUBLIC_SITE_URL` | `https://VPS_IP` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Contact-form widget key, if the form is used |
| `TURNSTILE_SECRET_KEY` | Contact-form check on the server |
| `MESSAGE_VIEW_UNLOCK_SECRET` | Any long random string. Opening a contact message requires it. `SUPABASE_JWT_SECRET` may be used instead if that is what Vercel already has. |
| `TRUSTED_PROXY_HOPS` | `1`. Nginx sits in front of Node. This makes sign-in lockouts use the real visitor IP. |
| `NODE_ENV` | `production` |

`NEXT_PUBLIC_*` values are copied into the built files when you run `npm run build`. If you change one, build again.

---

## From your computer

You need the VPS IP, the SSH username, and the private key. The provider shows these when the server is created.

```bash
ssh -i /path/to/your-key ubuntu@VPS_IP
```

That opens a shell on the server. Every command after this is typed in that shell, unless it says "on your computer".

`ubuntu` is the usual first user on an Ubuntu VPS image. Use the username your provider gave you.

---

## On the server, one step at a time

### 1. Update Ubuntu and install the programs

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
sudo npm install -g pm2
```

`apt update` refreshes the package list. `apt upgrade` installs Ubuntu security updates. `nginx` is the web server. `git` downloads the project. `ufw` is the firewall. The `curl` line adds NodeSource so you get Node.js 22, which this portal is built with. `node -v` should print `v22`. `pm2` keeps the portal running after you close SSH, and starts it again when the server reboots.

### 2. Open only the ports you use

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8443/tcp
sudo ufw enable
sudo ufw status
```

Port 22 is SSH. 80 and 443 are the public site. 8443 is the staff portal. Port 3000 is not listed, so strangers cannot reach Node directly.

### 3. A user and two folders

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /srv/ksl /var/www/ksl
sudo chown deploy:deploy /srv/ksl /var/www/ksl
```

`deploy` is the account that will own the code. It has no password of its own. `/srv/ksl` is private. `/var/www/ksl` is the only folder the public site is allowed to serve.

Copy your SSH key so `deploy` can log in, then use `sudo -u deploy` for the steps that follow. You can stay as the first user and prefix those commands with `sudo -u deploy`.

### 4. Download the code from GitHub

```bash
sudo -u deploy git clone https://github.com/harry934/KSL-website.git /srv/ksl/repo
```

This creates `/srv/ksl/repo`. Do not point Nginx at this folder. It contains `.git`, the portal, and the guides.

### 5. Copy the env file you already have

On your computer, after the three secrets are pasted and `bash deploy/vps/fill-ip.sh YOUR_IP` has been run:

```bash
scp -i /path/to/your-key staff-portal/.env.production ubuntu@VPS_IP:/tmp/ksl.env
```

`scp` copies the file over SSH. It lands in `/tmp` because your user can write there. Then, on the server, move it into place. Do this after step 4, so the folder exists.

```bash
sudo mv /tmp/ksl.env /srv/ksl/repo/staff-portal/.env.production
sudo chown deploy:deploy /srv/ksl/repo/staff-portal/.env.production
sudo chmod 600 /srv/ksl/repo/staff-portal/.env.production
```

`chmod 600` means only `deploy` can read the file. Do not open this file in a browser, and do not commit it.

### 6. Build and start the portal

```bash
sudo -u deploy bash -lc 'cd /srv/ksl/repo/staff-portal && npm ci && npm run build'
sudo -u deploy bash -lc 'cd /srv/ksl/repo/staff-portal && pm2 start npm --name ksl-portal -- start && pm2 save'
sudo env PATH="$PATH" pm2 startup systemd -u deploy --hp /home/deploy
```

`npm ci` installs the exact package versions from the lockfile. `npm run build` compiles the Next.js app and bakes in the `NEXT_PUBLIC_` values. `pm2 start` runs `npm start`, which is `next start`, on port 3000. `pm2 save` remembers that process. The last line prints and installs a boot service. Run the `sudo` line it prints if it asks you to.

Check:

```bash
sudo -u deploy pm2 status
curl -sI http://127.0.0.1:3000/login
ss -tlnp | grep 3000
```

`pm2 status` should say `online`. `curl` should show `HTTP/1.1 200`. `ss` should show `127.0.0.1:3000`, not `0.0.0.0:3000`.

### 7. Copy only the public files

```bash
sudo -u deploy bash /srv/ksl/repo/deploy/vps/publish-public.sh
```

That script copies the HTML, `css/`, `js/`, `lib/`, `img/`, `docs/`, and `data/` into `/var/www/ksl`. It does not copy `staff-portal/`, `guides/`, `deploy/`, or `.git`.

Before you run it, `js/portal-host.js` in the clone must contain your portal address. `fill-ip.sh` on your computer writes that line. If you edited it after `git clone`, copy the edited file up with `scp`, or edit the one line on the server, then run the publish script again.

### 8. Allow the public site to call the portal

You do not edit `middleware.ts` for this. `PUBLIC_SITE_ORIGIN` in the env file is the public site address (`https://VPS_IP`, no port). The build reads it. If you copied the env file before `npm run build` in step 6, this is already done. If you filled the IP later, build again:

```bash
sudo -u deploy bash -lc 'cd /srv/ksl/repo/staff-portal && npm run build && pm2 reload ksl-portal'
```

The Vercel address stays allowed, so https://ksl-website.vercel.app still works.

### 9. Certificate and Nginx

Create a certificate the browser will accept only after a warning:

```bash
sudo openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout /etc/ssl/private/ksl-ip.key \
  -out /etc/ssl/certs/ksl-ip.crt \
  -subj "/CN=VPS_IP"
sudo chmod 600 /etc/ssl/private/ksl-ip.key
```

`openssl req -x509` writes a self-signed certificate. `-days 825` is how long it lasts. `/CN=VPS_IP` puts the IP in the certificate name. Replace `VPS_IP` with the real address.

The site files are already in the repository. This copies them and writes your IP into the public one. Replace `YOUR_IP` with the same address you gave `fill-ip.sh`.

```bash
sudo sed "s/VPS_IP/YOUR_IP/g" /srv/ksl/repo/deploy/vps/nginx/ksl-public.conf | sudo tee /etc/nginx/sites-available/ksl-public >/dev/null
sudo cp /srv/ksl/repo/deploy/vps/nginx/ksl-portal.conf /etc/nginx/sites-available/ksl-portal
```

`ksl-public.conf` sends `http://` visitors to `https://`, serves `/var/www/ksl`, opens `about.html` for `/about`, and shows the branded 404. `ksl-portal.conf` forwards port 8443 to Node on port 3000, allows uploads up to 55 MB, and tells Node the visitor used HTTPS so the sign-in cookie is kept.

Enable both files:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/ksl-public /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/ksl-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` checks the files for mistakes. `reload` applies them without dropping SSH.

### 10. Look at it from your computer

In the browser, open `https://VPS_IP/`. Accept the certificate warning.

| Check | What you should see |
|-------|---------------------|
| Home page | The site, and news loaded from the portal |
| `https://VPS_IP/news.html` | The news list |
| `https://VPS_IP/this-page-does-not-exist` | The branded 404 |
| `https://VPS_IP:8443/login` | The staff sign-in page |
| Sign in | You land in the portal. The password was checked by Supabase. |
| Edit a news item and set it On website | The public news page shows it within about a minute |
| `https://VPS_IP/staff-portal/` | Nothing useful. It must not show source code or the env file. |

On the server:

```bash
sudo reboot
```

Wait a minute, SSH back in, and run `sudo -u deploy pm2 status`. `ksl-portal` should be `online` without you starting it.

---

## Updating later

SSH in, then:

```bash
sudo -u deploy bash -lc 'cd /srv/ksl/repo && git pull'
sudo -u deploy bash /srv/ksl/repo/deploy/vps/publish-public.sh
sudo -u deploy bash -lc 'cd /srv/ksl/repo/staff-portal && npm ci && npm run build && pm2 reload ksl-portal'
```

`git pull` downloads new commits from GitHub. The publish script copies the public files. `git pull` will put an empty `var origin` back into `js/portal-host.js` if that line was only changed on the server, so keep the portal address in git or set the line again before publishing. The last command rebuilds the portal. Skip it when you only changed HTML or CSS.

If the VPS is wrong and you need the old site, keep using https://ksl-website.vercel.app and https://ksl-websitekiza.vercel.app. Supabase is the same database either way. You do not restore a database to undo the move.

---

## What never moves onto the VPS

- The Supabase database
- Staff usernames, passwords, and sessions stored by Supabase Authentication
- Files in Supabase Storage
- The GitHub repository

The VPS only stores the code, the env file, and the public HTML. Lose the env file and the portal cannot sign anyone in, because it would no longer know how to reach Supabase. Keep a copy of that file somewhere safe that is not the website folder.

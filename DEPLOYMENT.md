# KSL VPS deployment guide (`vps-postgres`)

Project-specific procedure for deploying this repository on a Linux VPS with **PostgreSQL only** (no Supabase database/auth/storage for this cutover).

Related docs:

- Database deep-dive: [postgres/README.md](postgres/README.md)
- Historical Vercel/Supabase notes (archive): [guides/DEPLOYMENT.md](guides/DEPLOYMENT.md)

**Actual names used by this project**

| Resource | Name |
|----------|------|
| Database | `ksl` |
| Migrator role | `ksl_migrator` |
| Runtime role | `ksl_runtime` |
| App listen address | `127.0.0.1:3000` |
| Storage root | `/var/lib/ksl-portal/files` (`STORAGE_DIR`) |
| App clone path (suggested) | `/opt/ksl-website` |
| Public static root (suggested) | `/var/www/ksl` |

Do **not** invent alternate database/role names. Do **not** apply `supabase/migrations/*.sql` to this database.

**Safety legend**

- `[verify]` — read-only / status checks; safe to run anytime.
- `[change]` — creates or modifies databases, files, services, or configs. Review impact first.
- Never run destructive reset/drop commands against production data unless you intentionally restore from backup.

---

## Clone correctly (avoids “merge conflicts”)

You only need **one branch**. Do **not** clone `main` and merge `vps-postgres` into it on the VPS.

```sh
# [change] Fresh clone — no merge, no pull of main
sudo mkdir -p /opt/ksl-website
sudo chown "$USER":"$USER" /opt/ksl-website
git clone -b vps-postgres --single-branch https://github.com/harry934/KSL-website.git /opt/ksl-website
cd /opt/ksl-website
git status
git log -1 --oneline
```

**Expect:** `On branch vps-postgres`, clean tree, latest commit.  
**If Git talks about merge conflicts:** you mixed branches. Fix with a clean clone of `vps-postgres` only (or `git fetch` + `git checkout vps-postgres` and do **not** `git merge main`).  
**Do not** open the MySQL WIP on `main` on the VPS.

Company contact emails like `info@kenyashipyards.co.ke` in page footers can stay — those are contact addresses. What you **skip for now** is using `kenyashipyards.co.ke` as this app’s site/portal hostname until DNS points here.

---

## Stage 0: Show the site on the VPS IP

**Preferred (Nginx on :80):** public site at `http://YOUR_VPS_IP/` and portal at `http://YOUR_VPS_IP/kwela/login` (Node stays on `127.0.0.1:3000`).

Post-deploy mutation fixes, data inventory, and content import gates: [guides/POST-DEPLOY-AUDIT.md](guides/POST-DEPLOY-AUDIT.md).

Replace `YOUR_VPS_IP` everywhere (example `203.0.113.10`).

### 0.1 After PostgreSQL roles + clone (Stages 1–2 / clone above)

```sh
cd /opt/ksl-website
cp staff-portal/.env.example staff-portal/.env.production
bash deploy/vps/fill-ip.sh --http YOUR_VPS_IP
```

Then edit `staff-portal/.env.production` and set real values for:

- `DATABASE_URL` (runtime password)
- `STORAGE_DIR=/var/lib/ksl-portal/files`
- the three `*_SECRET` values (`openssl rand -base64 48`)

Leave Turnstile empty for private IP testing if you want.

`fill-ip.sh --http` sets:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_BASE_PATH` | `/kwela` |
| `NEXT_PUBLIC_PORTAL_URL` | `http://YOUR_VPS_IP/kwela` |
| `NEXT_PUBLIC_SITE_URL` | `http://YOUR_VPS_IP` |
| `PUBLIC_SITE_ORIGIN` | `http://YOUR_VPS_IP` |
| `js/portal-host.js` | same portal URL (overrides Vercel `data-ksl-content-api`) |

### 0.2 Migrate, install, build, admin `[change]`

```sh
# Migrator env (separate file)
sudo tee /etc/ksl-portal-migrator.env >/dev/null <<EOF
DATABASE_URL=postgresql://ksl_migrator:MIGRATOR_PASSWORD@127.0.0.1:5432/ksl
DATABASE_SSL=disable
EOF
sudo chmod 600 /etc/ksl-portal-migrator.env

cd /opt/ksl-website/staff-portal
npm ci
MIGRATOR_ENV_FILE=/etc/ksl-portal-migrator.env npm run db:migrate
set -a; . ./.env.production; set +a
npm run build
npm run bootstrap:admin
```

### 0.3 Run portal on the VPS IP (temporary, no Nginx) `[change]`

For IP smoke test only, bind all interfaces (firewall carefully):

```sh
cd /opt/ksl-website/staff-portal
set -a; . ./.env.production; set +a
# Temporary: listen on all interfaces so http://YOUR_VPS_IP:3000 works
npm run start -- --hostname 0.0.0.0 --port 3000
```

In another SSH session, serve the static site:

```sh
cd /opt/ksl-website
python3 -m http.server 8080 --bind 0.0.0.0
```

**Open in a browser (after Nginx from `deploy/vps/nginx/kenyashipyards-ip.conf`)**

- Public site: `http://YOUR_VPS_IP/`
- Portal login: `http://YOUR_VPS_IP/kwela/login`
- Health: `http://YOUR_VPS_IP/kwela/api/health` (or `curl http://127.0.0.1:3000/api/health` on the server)
- Old path: `http://YOUR_VPS_IP/admin` → 301 to `/kwela`

**Expect:** Pages load with `img/ksl` images; live CMS content comes from the portal API (via `portal-host.js`). Schema-only DBs show empty sections until a reviewed content import (see [guides/POST-DEPLOY-AUDIT.md](guides/POST-DEPLOY-AUDIT.md)). Password login works. Admin saves must hit `/kwela/api/...` (not bare `/api/...`).  
**Passkeys:** need HTTPS + matching portal hostname — skip until Nginx/TLS.  
**Precaution:** Do not open port 3000 publicly. systemd/PM2 keeps the portal on `127.0.0.1:3000` behind Nginx only.

### 0.4 When IP smoke test passes

Continue Stages 4–5 (systemd on loopback, Nginx, TLS). Only then introduce a real hostname. Rebuild after changing origins to HTTPS.

---

## Stage 1: VPS preparation

### 1.1 Verify PostgreSQL `[verify]`

```sh
systemctl status postgresql --no-pager
psql --version
sudo -u postgres psql -c 'SELECT version();'
sudo -u postgres psql -Atc 'SHOW listen_addresses;'
sudo -u postgres psql -Atc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1;"
sudo -u postgres psql -Atc "SELECT rolname FROM pg_roles ORDER BY 1;"
sudo ss -lntp | grep -E ':(5432)\b' || true
```

**Purpose:** Confirm PostgreSQL is installed and running, and see existing databases/roles before creating `ksl`.  
**Expect:** Active service; `listen_addresses` loopback-only (`localhost` / `127.0.0.1`).  
**Precaution:** If `ksl`, `ksl_migrator`, or `ksl_runtime` already exist, stop and inspect them — `postgres/bootstrap/roles.sql` refuses to reuse those names.

### 1.2 Verify Node.js and npm `[verify]`

```sh
node -v
npm -v
```

**Purpose:** Portal requires Node.js **20+** (22 LTS is fine).  
**Expect:** Version numbers print without error.

### 1.3 Verify web server / Nginx `[verify]`

```sh
command -v nginx || echo 'nginx not installed'
systemctl status nginx --no-pager 2>/dev/null || true
ls /etc/nginx/sites-enabled 2>/dev/null || true
```

**Purpose:** See whether Nginx already serves other sites (WordPress, osTicket, etc.).  
**Precaution:** Do not overwrite an existing site’s document root. This project’s public publisher uses `rsync --delete` to `/var/www/ksl` by default — only use that path if it is dedicated to KSL.

### 1.4 Choose deployment directories `[change]` (dirs only)

```sh
sudo mkdir -p /opt/ksl-website /var/www/ksl /var/lib/ksl-portal/files
sudo useradd --system --home /var/lib/ksl-portal --shell /usr/sbin/nologin ksl-portal 2>/dev/null || true
sudo chown -R ksl-portal:ksl-portal /var/lib/ksl-portal
sudo chown "$USER":"$USER" /opt/ksl-website
```

**Purpose:** Create app, public web, and storage locations plus the portal OS user.  
**Expect:** Directories exist; `ksl-portal` owns storage.

### 1.5 System packages `[change]`

Install only what is missing (examples for Ubuntu):

```sh
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib nginx
# Node: use your preferred Node 20+ install method, then re-check node -v
```

**Purpose:** Ensure PostgreSQL client/server tools, `pgcrypto` contrib, and Nginx are available.  
**Precaution:** Installing packages can restart services. Prefer verifying first (1.1–1.3) so you do not duplicate an existing Postgres install.

---

## Stage 2: PostgreSQL configuration

### 2.1 Create database and roles `[change]`

From a checkout of this repo (Stage 3 clone, or copy `postgres/bootstrap/roles.sql` temporarily):

```sh
cd /opt/ksl-website
sudo -u postgres psql -v ON_ERROR_STOP=1 -f postgres/bootstrap/roles.sql
```

**Purpose:** Creates `ksl_migrator`, `ksl_runtime`, database `ksl` owned by the migrator; grants CONNECT/USAGE to runtime; revokes public create.  
**Expect:** Message that `ksl` was provisioned.  
**Precaution:** Fails if those names already exist — inspect manually rather than dropping anything.

### 2.2 Set passwords `[change]`

```sh
sudo -u postgres psql
\password ksl_migrator
\password ksl_runtime
\q
```

**Purpose:** Set strong passwords without putting them in shell history.  
**Expect:** Interactive prompts succeed.

### 2.3 Verify connectivity `[verify]`

```sh
psql "postgresql://ksl_runtime@127.0.0.1:5432/ksl" -c 'SELECT current_user, current_database();'
psql "postgresql://ksl_migrator@127.0.0.1:5432/ksl" -c 'SELECT current_user, current_database();'
```

**Purpose:** Confirm both roles can connect locally.  
**Expect:** `ksl_runtime` / `ksl_migrator` and database `ksl`.

### 2.4 Connection strings for later env files

Runtime (portal process):

`postgresql://ksl_runtime:RUNTIME_PASSWORD@127.0.0.1:5432/ksl`

Migrator (migrations only):

`postgresql://ksl_migrator:MIGRATOR_PASSWORD@127.0.0.1:5432/ksl`

Use `DATABASE_SSL=disable` only for loopback. Never expose `5432` publicly.

---

## Stage 3: Application deployment

### 3.1 Clone `vps-postgres` `[change]`

```sh
git clone -b vps-postgres https://github.com/harry934/KSL-website.git /opt/ksl-website
cd /opt/ksl-website
git rev-parse --abbrev-ref HEAD
git log -1 --oneline
```

**Purpose:** Get the PostgreSQL deployment branch.  
**Expect:** Branch `vps-postgres` and a recent commit hash.

### 3.2 Install dependencies `[change]`

```sh
cd /opt/ksl-website/staff-portal
npm ci
```

**Purpose:** Install exact lockfile dependencies for the staff portal.  
**Expect:** Install completes without missing peer errors.

### 3.3 Production environment files `[change]`

```sh
sudo cp /opt/ksl-website/staff-portal/.env.example /etc/ksl-portal.env
sudo chown root:ksl-portal /etc/ksl-portal.env
sudo chmod 640 /etc/ksl-portal.env
sudo install -m 600 /dev/null /etc/ksl-portal-migrator.env
```

Edit `/etc/ksl-portal.env` (runtime — **no migrator password**).

For **IP Stage 0** use HTTP IP origins (see Stage 0 / `fill-ip.sh --http`).  
For **later Nginx + DNS**, switch to HTTPS hostnames and rebuild — do not require `kenyashipyards.co.ke` until that DNS points at this VPS.

```env
DATABASE_URL=postgresql://ksl_runtime:RUNTIME_PASSWORD@127.0.0.1:5432/ksl
DATABASE_POOL_MAX=10
DATABASE_SSL=disable
STORAGE_DIR=/var/lib/ksl-portal/files
STORED_FILE_SIGNING_SECRET=
CONTACT_TOKEN_SECRET=
MESSAGE_VIEW_UNLOCK_SECRET=
NEXT_PUBLIC_BASE_PATH=/kwela
NEXT_PUBLIC_PORTAL_URL=http://YOUR_VPS_IP/kwela
NEXT_PUBLIC_SITE_URL=http://YOUR_VPS_IP
PUBLIC_SITE_ORIGIN=http://YOUR_VPS_IP
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TRUSTED_PROXY_HOPS=1
NODE_ENV=production
```

Generate secrets:

```sh
openssl rand -base64 48
```

Migrator file `/etc/ksl-portal-migrator.env`:

```env
DATABASE_URL=postgresql://ksl_migrator:MIGRATOR_PASSWORD@127.0.0.1:5432/ksl
DATABASE_SSL=disable
```

```sh
sudo chmod 600 /etc/ksl-portal-migrator.env
```

**Purpose:** Separate runtime vs schema-change credentials.  
**Precaution:** Never commit populated env files. Passkeys use `NEXT_PUBLIC_PORTAL_URL` as WebAuthn RP ID/origin — set the real HTTPS portal hostname before staff register passkeys.

### 3.4 Filesystem storage permissions `[change]`

```sh
sudo mkdir -p /var/lib/ksl-portal/files/media-public \
  /var/lib/ksl-portal/files/downloads \
  /var/lib/ksl-portal/files/avatars
sudo chown -R ksl-portal:ksl-portal /var/lib/ksl-portal
sudo chmod 700 /var/lib/ksl-portal /var/lib/ksl-portal/files
```

**Purpose:** Buckets for new uploads; metadata lives in PostgreSQL `stored_files`.  
**Note:** Existing public website images ship from the repo under `img/ksl/` (static defaults). Historical Supabase Storage migration is a later, separate task.

### 3.5 Apply migrations `[change]`

```sh
cd /opt/ksl-website/staff-portal
MIGRATOR_ENV_FILE=/etc/ksl-portal-migrator.env npm run db:migrate
```

**Purpose:** Applies pending files in `postgres/migrations/` (`001_standalone_schema`, `002_webauthn_passkeys`, …) with checksums in `schema_migrations`.  
**Expect:** Each new version prints `Applied …`; re-run prints `Database is current`.  
**Precaution:** Does not drop data. Failed migrations roll back that file and do not record it. Never edit an already-applied migration — add a new numbered file.

Verify `[verify]`:

```sh
psql "postgresql://ksl_runtime@127.0.0.1:5432/ksl" -c \
  "SELECT version, applied_at FROM public.schema_migrations ORDER BY version;"
psql "postgresql://ksl_runtime@127.0.0.1:5432/ksl" -c \
  "SELECT to_regclass('public.webauthn_credentials') AS passkeys,
          to_regclass('public.admin_profiles') AS profiles;"
```

### 3.6 Build `[change]`

```sh
cd /opt/ksl-website/staff-portal
set -a
# shellcheck disable=SC1091
. /etc/ksl-portal.env
set +a
npm run build
```

**Purpose:** Production Next.js build; embeds `NEXT_PUBLIC_*` values.  
**Expect:** Build succeeds and lists routes including `/api/health` and `/api/auth/passkey`.

### 3.7 Initial administrator `[change]`

```sh
cd /opt/ksl-website/staff-portal
set -a; . /etc/ksl-portal.env; set +a
npm run bootstrap:admin
```

**Purpose:** Creates the first local super-admin (bcrypt cost 12); forces password change on first login.  
**Expect:** Interactive prompts; refuses to replace an existing super-admin.  
**Precaution:** Do not import Supabase password hashes.

Optional content seed from repo JSON (not required for launch if public pages use `data/*.json` + `img/ksl`):

```sh
npm run import:gallery   # uses staff-portal/migration-data/gallery.json → DB
```

---

## Stage 4: Application service

### 4.1 Install systemd unit `[change]`

```sh
sudo cp /opt/ksl-website/deploy/vps/ksl-portal.service /etc/systemd/system/ksl-portal.service
# Edit WorkingDirectory / paths if your layout differs
sudo systemctl daemon-reload
sudo systemctl enable --now ksl-portal
```

**Purpose:** Runs `npm run start -- --hostname 127.0.0.1 --port 3000` as `ksl-portal` with `/etc/ksl-portal.env`.  
**Expect:** `active (running)`.

### 4.2 Verify service and logs `[verify]`

```sh
sudo systemctl status ksl-portal --no-pager
sudo journalctl -u ksl-portal -n 80 --no-pager
```

### 4.3 Health endpoint `[verify]`

```sh
curl -sS http://127.0.0.1:3000/api/health
```

**Expect:** `{"status":"ok","database":"up"}`.

---

## Stage 5: Nginx and public access

### 5.1 Publish static public site `[change]`

Confirm `/var/www/ksl` is **only** for this site (rsync deletes extras):

```sh
bash /opt/ksl-website/deploy/vps/publish-public.sh
# or: DEST=/var/www/ksl bash /opt/ksl-website/deploy/vps/publish-public.sh
```

**Purpose:** Copies HTML/css/js/lib/img/docs/data including `img/ksl` defaults and `data/gallery.json`.  
**Precaution:** Wrong `DEST` can wipe another website.

### 5.2 Install Nginx site configs `[change]`

**IP / same-host preferred template:**

- `deploy/vps/nginx/kenyashipyards-ip.conf` — static site on `:80` + portal at `/kwela` → `127.0.0.1:3000` (with `/admin` → `/kwela` redirect)

**Legacy split-port templates (optional):**

- `deploy/vps/nginx/ksl-public.conf` — static site + `/storage/media-public/` → `$STORAGE_DIR/media-public`
- `deploy/vps/nginx/ksl-portal.conf` — TLS on `8443` → `127.0.0.1:3000` (portal at host root; set `NEXT_PUBLIC_BASE_PATH` empty if used)

```sh
# Preferred IP layout
sudo cp /opt/ksl-website/deploy/vps/nginx/kenyashipyards-ip.conf /etc/nginx/sites-available/kenyashipyards
sudo ln -sf /etc/nginx/sites-available/kenyashipyards /etc/nginx/sites-enabled/kenyashipyards
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

**Purpose:** Reverse-proxy portal under `/kwela`; serve static site.  
**Precaution:** Review enabled sites so you do not steal another app’s `default_server`. Private buckets (`downloads`, `avatars`) must **not** be aliased publicly. Rebuild the portal after any `NEXT_PUBLIC_BASE_PATH` / portal URL change.

### 5.3 DNS and SSL `[change]`

Replace placeholder IP certificates with real certs (Let’s Encrypt or corporate PKI). Update `server_name`, then set matching `NEXT_PUBLIC_PORTAL_URL` / `NEXT_PUBLIC_SITE_URL` / `PUBLIC_SITE_ORIGIN` and **rebuild** the portal so passkeys and public origins match.

### 5.4 Firewall `[change]`

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Stage 1 private test: do NOT open 8443; use SSH tunnel instead:
#   ssh -L 8443:127.0.0.1:8443 user@VPS
sudo ufw enable
sudo ufw status
```

**Precaution:** Never open PostgreSQL `5432` to the world.

### 5.5 Pre-public test `[verify]`

1. Tunnel or local curl to health and login.
2. Confirm public pages load images from `/img/ksl/...`.
3. Confirm gallery falls back to `data/gallery.json` if the API is down.
4. Only then point DNS / open public HTTPS.

---

## Stage 6: Backups and maintenance

### 6.1 Backup PostgreSQL `[change]` (writes backup files only)

```sh
sudo mkdir -p /secure-backups
sudo -u postgres pg_dump --format=custom --file=/secure-backups/ksl-$(date +%Y%m%d).dump ksl
```

### 6.2 Backup uploads `[change]`

```sh
sudo tar -czf /secure-backups/ksl-files-$(date +%Y%m%d).tar.gz -C /var/lib/ksl-portal files
```

Repo static images under `img/ksl` are version-controlled separately via Git.

### 6.3 Restore (test on a disposable DB first) `[change]`

```sh
sudo -u postgres createdb --owner=ksl_migrator ksl_restore
sudo -u postgres pg_restore --no-owner --role=ksl_migrator --dbname=ksl_restore /secure-backups/ksl-YYYYMMDD.dump
```

Restore files with ownership preserved into a staging `STORAGE_DIR` before swapping production.

**Precaution:** Restoring over the live `ksl` database replaces live data — only after a verified backup and maintenance window.

### 6.4 Future code updates

```sh
cd /opt/ksl-website
git pull origin vps-postgres
cd staff-portal
npm ci
MIGRATOR_ENV_FILE=/etc/ksl-portal-migrator.env npm run db:migrate
set -a; . /etc/ksl-portal.env; set +a
npm run build
sudo systemctl restart ksl-portal
bash /opt/ksl-website/deploy/vps/publish-public.sh
curl -sS http://127.0.0.1:3000/api/health
```

Back up DB + `STORAGE_DIR` before schema migrations. There are no automatic down-migrations.

---

## Stage 7: Verification checklist

| Check | How |
|-------|-----|
| Website loads | Open public site; pages render with `img/ksl` assets |
| Authentication (password) | Sign in at portal login with bootstrap admin |
| Passkeys | After HTTPS portal URL is correct: My account → register passkey → sign out → “Sign in with a passkey” |
| Sessions | Idle timeout / single-session behaviour; pulse keeps session alive while active |
| CRUD | Create/edit a news draft or FAQ item in the portal |
| Default images | Logos, heroes, gallery from `img/ksl` / `data/*.json` without broken placeholders |
| New uploads | Upload via portal; file appears under `STORAGE_DIR`; row in `stored_files` |
| Public gallery | `/api/public/gallery` when portal up; else `data/gallery.json` fallback |
| Admin | Modules load; staff invite/bootstrap works |
| Health | `curl -sS http://127.0.0.1:3000/api/health` → `ok` |
| Restart survival | `sudo systemctl restart ksl-portal` then health + login again |

---

## Local developer checks (not the VPS)

```sh
cd staff-portal
npm ci
npm test
npm run test:pg    # disposable embedded PostgreSQL; migrate twice + smoke
npx tsc --noEmit
npm run lint
NEXT_PUBLIC_SITE_URL=https://www.example.test NEXT_PUBLIC_PORTAL_URL=https://portal.example.test npm run build
```

Never point `test:pg`, migrator, or smoke scripts at the production VPS database.

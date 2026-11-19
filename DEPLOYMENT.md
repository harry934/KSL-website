# KSL VPS deployment (`vps-postgres`)

Project-specific steps for deploying this repository on a Linux VPS with local PostgreSQL. This branch does **not** use Supabase for database, auth, or storage.

Deep database notes: [postgres/README.md](postgres/README.md)  
Historical Vercel/Supabase guide (archive only): [guides/DEPLOYMENT.md](guides/DEPLOYMENT.md)

**Naming note:** This project uses database `ksl`, migrator role `ksl_migrator`, and runtime role `ksl_runtime`. That is the equivalent of a generic `website_db` / `website_user` pair; do not invent a second set of roles.

Suggested layout used below:

| Path | Purpose |
|------|---------|
| `/opt/ksl-website` | Git clone of this repository |
| `/etc/ksl-portal.env` | Runtime environment (mode `600`) |
| `/etc/ksl-portal-migrator.env` | Migrator-only `DATABASE_URL` (mode `600`) |
| `/var/lib/ksl-portal/files` | `STORAGE_DIR` (media-public, downloads, avatars) |
| `/var/www/ksl` | Published static public site |

---

## 1. Verify PostgreSQL

```sh
systemctl status postgresql --no-pager
psql --version
sudo -u postgres psql -c 'SELECT version();'
sudo -u postgres psql -Atc 'SHOW listen_addresses;'
sudo ss -lntp | grep -E ':(5432)\b' || true
```

Keep PostgreSQL on loopback (`listen_addresses = 'localhost'` or `127.0.0.1`). Do not expose `5432` to the internet.

Install the `pgcrypto` extension package if your distro splits it out (Ubuntu usually includes it with `postgresql-contrib`).

## 2–4. Create database, roles, and permissions

From the repository root on the VPS (after clone, or copy the SQL file over first):

```sh
cd /opt/ksl-website
sudo -u postgres psql -v ON_ERROR_STOP=1 -f postgres/bootstrap/roles.sql
```

Set passwords interactively (do not put passwords on the command line):

```sh
sudo -u postgres psql
\password ksl_migrator
\password ksl_runtime
\q
```

`roles.sql` creates `ksl`, `ksl_migrator`, and `ksl_runtime`, grants connect/usage to the runtime role, and refuses to reuse existing names. Table grants are applied by migrations, not by the bootstrap script.

### Verify local connectivity

```sh
sudo -u postgres psql -d ksl -c '\conninfo'
psql "postgresql://ksl_runtime@127.0.0.1:5432/ksl" -c 'SELECT current_user, current_database();'
```

You will be prompted for the runtime password.

## 5. Install Node.js and OS dependencies

Use Node.js **20+** (22 LTS is fine). Example with NodeSource or your preferred method:

```sh
node -v
npm -v
```

Also install Nginx when you are ready for Stage 2 reverse proxy / TLS (optional for SSH-tunnel-only Stage 1).

Create the portal OS user and storage directory:

```sh
sudo useradd --system --home /var/lib/ksl-portal --shell /usr/sbin/nologin ksl-portal || true
sudo mkdir -p /var/lib/ksl-portal/files /opt/ksl-website
sudo chown -R ksl-portal:ksl-portal /var/lib/ksl-portal
```

## 6. Clone the `vps-postgres` branch

```sh
sudo mkdir -p /opt/ksl-website
sudo chown "$USER":"$USER" /opt/ksl-website
git clone -b vps-postgres https://github.com/harry934/KSL-website.git /opt/ksl-website
cd /opt/ksl-website
git rev-parse --abbrev-ref HEAD
git log -1 --oneline
```

## 7. Configure production environment

```sh
sudo cp /opt/ksl-website/staff-portal/.env.example /etc/ksl-portal.env
sudo install -m 600 /dev/null /etc/ksl-portal-migrator.env
sudo chown root:ksl-portal /etc/ksl-portal.env
sudo chmod 640 /etc/ksl-portal.env
```

Edit `/etc/ksl-portal.env` and set at least:

```env
DATABASE_URL=postgresql://ksl_runtime:REPLACE_WITH_RUNTIME_PASSWORD@127.0.0.1:5432/ksl
DATABASE_POOL_MAX=10
DATABASE_SSL=disable
STORAGE_DIR=/var/lib/ksl-portal/files
STORED_FILE_SIGNING_SECRET=
CONTACT_TOKEN_SECRET=
MESSAGE_VIEW_UNLOCK_SECRET=
NEXT_PUBLIC_PORTAL_URL=https://portal.example.co.ke
NEXT_PUBLIC_SITE_URL=https://www.kenyashipyards.co.ke
PUBLIC_SITE_ORIGIN=https://www.kenyashipyards.co.ke,https://kenyashipyards.co.ke
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TRUSTED_PROXY_HOPS=1
NODE_ENV=production
```

Generate secrets independently:

```sh
openssl rand -base64 48
```

Migrator env (separate file; migrator role only):

```sh
sudo tee /etc/ksl-portal-migrator.env >/dev/null <<'EOF'
DATABASE_URL=postgresql://ksl_migrator:REPLACE_WITH_MIGRATOR_PASSWORD@127.0.0.1:5432/ksl
DATABASE_SSL=disable
EOF
sudo chmod 600 /etc/ksl-portal-migrator.env
```

Never commit populated env files. Never put migrator credentials in the runtime env.

Symlink or copy the runtime env where Next.js expects it if you prefer a file inside the app tree:

```sh
sudo ln -sf /etc/ksl-portal.env /opt/ksl-website/staff-portal/.env.production
```

The systemd unit below loads `/etc/ksl-portal.env` via `EnvironmentFile=`.

## 8. Install production dependencies

```sh
cd /opt/ksl-website/staff-portal
npm ci
```

## 9. Execute database migrations

```sh
cd /opt/ksl-website/staff-portal
MIGRATOR_ENV_FILE=/etc/ksl-portal-migrator.env npm run db:migrate
```

The runner:

- requires the connected role to be `ksl_migrator`
- records versions/checksums in `public.schema_migrations`
- applies only pending files under `postgres/migrations/`
- refuses changed checksums for already-applied migrations

**Do not** run `supabase/migrations/*.sql` against this database.

Rollback is by restoring a tested `pg_dump` backup, not by automatic down-migrations.

## 10. Verify expected tables

```sh
psql "postgresql://ksl_runtime@127.0.0.1:5432/ksl" -c \
  "SELECT version, applied_at FROM public.schema_migrations ORDER BY version;"

psql "postgresql://ksl_runtime@127.0.0.1:5432/ksl" -c \
  "SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
   ORDER BY table_name;"
```

You should see `001_standalone_schema` and application tables such as `admin_profiles`, `staff_sessions`, `news_items`, `gallery_photos`, `stored_files`, and others (about 40+ public tables including `schema_migrations`).

## 11. Build the application

`NEXT_PUBLIC_*` values are embedded at build time:

```sh
cd /opt/ksl-website/staff-portal
set -a
# shellcheck disable=SC1091
. /etc/ksl-portal.env
set +a
npm run build
```

Do not pass secrets on the command line beyond what is already in the env file.

Create the first super-admin (interactive password prompt):

```sh
cd /opt/ksl-website/staff-portal
set -a; . /etc/ksl-portal.env; set +a
npm run bootstrap:admin
```

## 12. Process manager (systemd)

Review and install the unit template:

```sh
sudo cp /opt/ksl-website/deploy/vps/ksl-portal.service /etc/systemd/system/ksl-portal.service
sudo systemctl daemon-reload
sudo systemctl enable --now ksl-portal
sudo systemctl status ksl-portal --no-pager
```

The unit runs `npm run start -- --hostname 127.0.0.1 --port 3000` as `ksl-portal`, after PostgreSQL, with `EnvironmentFile=/etc/ksl-portal.env`.

Adjust `WorkingDirectory`, Node/npm paths, and `ReadWritePaths` if your layout differs. Ensure `ksl-portal` can read the env file and write `STORAGE_DIR` plus `staff-portal/.next/cache`.

Health check (once the service is up):

```sh
curl -sS http://127.0.0.1:3000/api/health
```

Expect `{"status":"ok","database":"up"}`.

## 13. Nginx reverse proxy

Templates live in `deploy/vps/nginx/`:

- `ksl-public.conf` — static public site + `/storage/media-public/` alias to `$STORAGE_DIR/media-public`
- `ksl-portal.conf` — TLS on port 8443 proxying to `127.0.0.1:3000`

Example:

```sh
sudo apt-get install -y nginx
sudo sed "s/VPS_IP/YOUR_PUBLIC_IP/g" /opt/ksl-website/deploy/vps/nginx/ksl-public.conf \
  | sudo tee /etc/nginx/sites-available/ksl-public
sudo cp /opt/ksl-website/deploy/vps/nginx/ksl-portal.conf /etc/nginx/sites-available/ksl-portal
sudo ln -sf /etc/nginx/sites-available/ksl-public /etc/nginx/sites-enabled/ksl-public
sudo ln -sf /etc/nginx/sites-available/ksl-portal /etc/nginx/sites-enabled/ksl-portal
sudo nginx -t
sudo systemctl reload nginx
```

Publish static files (confirm `DEST` is a dedicated KSL root — `rsync --delete` is destructive):

```sh
bash /opt/ksl-website/deploy/vps/publish-public.sh
# or: DEST=/var/www/ksl bash /opt/ksl-website/deploy/vps/publish-public.sh
```

Point public HTML `data-ksl-content-api` at the portal origin and keep that origin in `PUBLIC_SITE_ORIGIN`.

## 14. Domain and SSL

Replace IP certificates in the nginx templates with your real certificates (Let's Encrypt or corporate PKI). Update `server_name`, `NEXT_PUBLIC_PORTAL_URL`, `NEXT_PUBLIC_SITE_URL`, and `PUBLIC_SITE_ORIGIN`, then rebuild the portal so public origins are correct.

## 15. Firewall

Allow only what you need, for example:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Stage 1 SSH-tunnel only: do NOT open 8443 publicly; use ssh -L instead.
sudo ufw enable
sudo ufw status
```

Never open PostgreSQL `5432` publicly.

## 16. Database and file backups

```sh
sudo -u postgres pg_dump --format=custom --file=/secure-backups/ksl-$(date +%Y%m%d).dump ksl
sudo tar -czf /secure-backups/ksl-files-$(date +%Y%m%d).tar.gz -C /var/lib/ksl-portal files
```

Store encrypted copies off-box. A database dump does **not** include `STORAGE_DIR` file bodies.

Test restore into a separate empty database before you need it in an emergency.

## 17. Test the production website

1. `curl -sS http://127.0.0.1:3000/api/health`
2. Open the portal login (SSH tunnel or HTTPS).
3. Sign in with the bootstrap admin; complete forced password change.
4. Publish a news item; confirm `/api/public/news` returns it.
5. Confirm public pages load from `/var/www/ksl` and call the portal API.
6. Upload a public media file; confirm it is under `/var/lib/ksl-portal/files/media-public/`.

## Subsequent deployment workflow

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

### Precautions

- Back up PostgreSQL and `STORAGE_DIR` before migrations that change schema.
- If a migration fails, it rolls back that file’s transaction and does not write a `schema_migrations` row. Fix the SQL, then re-run; do not hand-edit `schema_migrations`.
- Never edit an already-applied migration file; add a new numbered `00N_*.sql` instead.
- Do not point `publish-public.sh` at WordPress, osTicket, or a shared web root.

## Local developer verification (not the VPS)

From `staff-portal/` on a workstation:

```sh
npm ci
npm test
npm run test:pg    # disposable embedded PostgreSQL: migrate twice + CRUD smoke
npx tsc --noEmit
npm run lint
NEXT_PUBLIC_SITE_URL=https://www.example.test NEXT_PUBLIC_PORTAL_URL=https://portal.example.test npm run build
```

`npm run test:pg` must never be pointed at the production VPS database.

# Content and media restore (vps-postgres)

**Do not run production imports until you explicitly authorize them.**  
This guide restores CMS content from the **live Vercel portal** (still the richest source) plus downloadable Supabase Storage public objects, into PostgreSQL + `$STORAGE_DIR`.

Related: [POST-DEPLOY-AUDIT.md](./POST-DEPLOY-AUDIT.md) · [../DEPLOYMENT.md](../DEPLOYMENT.md)

---

## Source inventory (inspected 19 Nov 2026)

| Source | Status | Notes |
|--------|--------|--------|
| Live portal `https://ksl-websitekiza.vercel.app/api/public/*` | **Available** | news 4, gallery 71 photos / 3 videos, services 13, products 4, projects 39, FAQ 6 groups, org leadership/board/milestones, CSR, downloads, settings, site-images (32 slots + hero) |
| Supabase Storage public objects | **Many still downloadable** | URLs under `envqgczfhxywkxcnsxrt.supabase.co/storage/v1/object/public/...` |
| Supabase REST without key | 401 | Full DB dump needs `SOURCE_DATABASE_URL` / service role if more than public APIs |
| Repo `data/*.json` + `img/ksl/` | Available fallback | Slightly older/smaller than live portal (e.g. gallery 57 in repo vs 71 live) |
| VPS Postgres `http://178.162.219.218/kwela/api/public/news` | Empty CMS | Schema-only until import |

**Staff:** not migrated. Use `cleanup-staff.mjs` to soft-remove old accounts while keeping your super-admin.

---

## Image upload fix

Two bugs stacked on the VPS portal:

1. `safeImageUrl()` only allowed `https:`, so HTTP portal upload URLs were rejected with **“Choose an image file.”**
2. `storedFileUrl()` used `new URL("/api/stored-file", portalUrl)`, which **drops `/kwela`**, so uploads saved files but returned `http://VPS/api/stored-file?...` (404). Staff/org photos then showed as broken images.

Fix (in code): allow http for configured portal/site hosts (hostname with or without port); keep `/kwela` in stored-file URLs; rewrite legacy broken URLs in public API payloads; Nginx 301 from `/api/stored-file` → `/kwela/api/stored-file`.

After pulling this commit on the VPS: update env with `bash deploy/vps/fill-ip.sh --http 178.162.219.218`, rebuild/restart the portal, reload Nginx from `deploy/vps/nginx/kenyashipyards-ip.conf`.

---

## Build restore package (safe, no DB writes)

On a machine with network access (your PC):

```sh
cd "/home/harry/Github Projects/kenya-shipyards website-vps-postgres/staff-portal"
node scripts/build-restore-package.mjs /tmp/ksl-restore
```

Produces outside the repo:

- `public-snapshot.json` — raw live API payloads  
- `content-export.json` — Postgres table rows (stable UUIDs, slug upserts)  
- `storage/` — downloaded Supabase objects  
- `REPORT.json` — counts + missing files  

Review `REPORT.json` before any import.

---

## Dry-run import (disposable Postgres)

```sh
cd staff-portal
npm run test:pg   # already exercises import:content-export dry-run
# Or against a throwaway DB:
DATABASE_URL=postgresql://ksl_runtime:...@127.0.0.1:5432/ksl_restore_test \
  npm run import:content-export -- /tmp/ksl-restore/content-export.json
STORAGE_DIR=/tmp/ksl-restore-files \
  npm run import:storage-objects -- /tmp/ksl-restore/storage
```

---

## Production VPS import (only after your authorization)

Paths on your server today: `/opt/kenyashipyards/admin-api`.

1. Copy `/tmp/ksl-restore` to the VPS **outside** the repo (e.g. `/var/lib/ksl-portal/imports/ksl-restore`).
2. Backup Postgres (`pg_dump`) first.
3. From `staff-portal` with production env loaded:

```sh
cd /opt/kenyashipyards/admin-api/staff-portal
set -a; . ./.env.production; set +a
npm run import:content-export -- /var/lib/ksl-portal/imports/ksl-restore/content-export.json
npm run import:storage-objects -- /var/lib/ksl-portal/imports/ksl-restore/storage
```

4. Ensure static `img/ksl` is published to the public web root (relative image paths).
5. Staff cleanup (replace username):

```sh
KEEP_ADMIN_USERNAME='your-username' npm run cleanup:staff -- --dry-run
KEEP_ADMIN_USERNAME='your-username' npm run cleanup:staff -- --apply
```

6. Smoke: public news/gallery/projects, upload a JPG in site images, invite create.

---

## What this does / does not do

- **Does:** restore public CMS rows + downloadable remote media; keep `img/ksl` references; idempotent upserts by slug/id/slot.
- **Does not:** copy old staff passwords; modify `main`; use MySQL; reset the DB; run on VPS without your OK.

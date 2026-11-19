# Post-deploy audit — admin mutations, data, media

**Branch:** `vps-postgres` only.  
**Database:** PostgreSQL `ksl` on the VPS (no MySQL).  
**Do not** DROP/TRUNCATE production tables. **Do not** bulk-import until the inventory map below is reviewed.

Related: [../DEPLOYMENT.md](../DEPLOYMENT.md) · [../postgres/MIGRATION-COVERAGE.md](../postgres/MIGRATION-COVERAGE.md)

---

## Confirmed root causes (code)

| Symptom | Cause | Fix |
|---------|--------|-----|
| Saves / invites show “Something went wrong” | `sendJson` called bare `/api/...` while Nginx only proxies `/kwela` (was `/admin`) | `sendJson` uses `appPath()` |
| Saves still fail after routing works | `.upsert()` emitted `ON CONFLICT DO UPDATE` without a target | Default conflict to `id`; explicit keys for `site_settings` / `site_image_overrides` |
| Public sections blank | Schema-only migrate; empty content tables; live empty API wins over `data/*.json` | Inventory + mapped import (below) |
| Public gallery always empty | `/api/public/gallery` stubbed to `[]` | Restored published queries |

Staff invites have **no SMTP** (mailto / WhatsApp). After the `sendJson` fix, create/cancel invite APIs work; delivery is still manual.

---

## Portal URL

| Before | After |
|--------|--------|
| `http://VPS_IP/admin` | `http://VPS_IP/kwela` |
| `NEXT_PUBLIC_BASE_PATH=/admin` | `/kwela` |

Nginx keeps a temporary redirect from `/admin` → `/kwela`. Auth, RBAC, sessions, and origin checks remain the real controls.

---

## Inventory commands (read-only)

### VPS Postgres (production-safe SELECT counts)

```sh
cd /opt/ksl-website/staff-portal   # or your clone path
set -a; . ./.env.production; set +a
npm run inventory:postgres
```

### Historical Supabase (operator machine; secrets never committed)

```sh
cd staff-portal
SOURCE_DATABASE_URL='postgresql://...' \
  SUPABASE_URL='https://envqgczfhxywkxcnsxrt.supabase.co' \
  SUPABASE_SERVICE_ROLE_KEY='...' \
  EXPORT_PATH=/tmp/ksl-content-export.json \
  npm run inventory:supabase
```

If Supabase credentials are unavailable, inventory fallbacks:

- Repo static JSON under `data/*.json` and `staff-portal/migration-data/gallery.json`
- Static images under `img/ksl/`
- Any remaining Vercel portal still serving live CMS data

**Gate:** review counts + export shape before any `import:content-export` / `import:storage-objects` on production.

---

## Source → destination map

| Source (Supabase / export) | Destination (Postgres `ksl`) | Importer |
|----------------------------|------------------------------|----------|
| `news_items` | `news_items` | `import:content-export` or `import:news` |
| `event_items` | `event_items` | `import:content-export` / `import-events-from-json.mjs` |
| `gallery_photos` / `gallery_videos` | same | `import:content-export` / `import:gallery` |
| `faq_groups` / `faq_items` | same | `import:content-export` / `import:faq` |
| `service_items` + `services_settings` | same | `import:content-export` / `import-services-from-json.mjs` |
| `projects` + `projects_settings` | same | `import:content-export` |
| `products` + `products_settings` | same | `import:content-export` |
| `career_listings` + `careers_settings` | same | `import:content-export` |
| `download_items` + `downloads_settings` | same | `import:content-export` |
| `organization_*` + settings | same | `import:content-export` |
| `press_assets` + `press_settings` | same | `import:content-export` |
| `csr_projects` + `csr_settings` | same | `import:content-export` |
| `site_settings` / `site_image_overrides` | same | `import:content-export` |
| Storage buckets `media-public`, `downloads`, `avatars` | `$STORAGE_DIR/{bucket}/...` + `stored_files` | `import:storage-objects` |
| `admin_profiles` / `auth.users` passwords | **not imported** | `bootstrap:admin` + invites |

Export must live **outside** the repo. Importers reject password hashes and `auth` schemas.

### Media URL mapping

```
Supabase: https://<project>.supabase.co/storage/v1/object/.../<bucket>/<path>
    → file: $STORAGE_DIR/<bucket>/<path>
    → public: {NEXT_PUBLIC_PORTAL_URL}/api/stored-file?bucket=...&path=...
    → or Nginx: /storage/media-public/<path>  (public media only)
```

Static site assets under `img/` are unchanged and are not Supabase objects.

---

## Production import (only after map approval)

Dry-run first on disposable Postgres (`npm run test:pg` / a throwaway DB), then on the VPS:

```sh
# Content (reviewed export outside the repo)
cd /opt/ksl-website/staff-portal
set -a; . ./.env.production; set +a
npm run import:content-export -- /var/lib/ksl-portal/imports/content-export.json

# Files already copied to STORAGE_DIR buckets
npm run import:storage-objects -- /var/lib/ksl-portal/imports/storage-tree

# Rebuild/reload portal if NEXT_PUBLIC_* changed; republish static site so portal-host.js is current
sudo systemctl reload nginx   # or your process manager reload for ksl-portal
```

Do **not** copy Supabase password hashes. Existing staff sign in only after local bootstrap/invite/reset.

---

## Production smoke checklist (after deploy)

1. Open `http://VPS_IP/kwela/login` — sign in.
2. Create or edit a news item and save — no generic error; Network shows `POST …/kwela/api/news`.
3. Publish content → public page section updates via `/kwela/api/public/...`.
4. Upload an image → file under `$STORAGE_DIR` → URL loads.
5. Create a staff invite → row appears; link is `/kwela/i/...`.
6. Gallery: published photos appear from `/kwela/api/public/gallery` (when public gallery page is used).
7. `/admin` redirects to `/kwela`; unauthenticated portal routes still require login.

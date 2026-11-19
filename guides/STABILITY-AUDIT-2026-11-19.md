# Stability audit report — 19 Nov 2026 (`vps-postgres`)

## Issues discovered and root causes

| Area | Symptom | Root cause |
|------|---------|------------|
| Staff | “Could not load the staff list.” | `GET /api/staff` used Supabase-style `permissions:admin_module_permissions(...)` which the Postgres `db-client` cannot parse → 500 |
| Public sync | Admin saves don’t show on the website | 1) Public JS `safeUrl` rejected HTTP VPS media URLs 2) `ksl-live.js` / `ksl-content.js` silently fell back to stale `data/*.json` 3) Public APIs used `s-maxage=60` shared cache |
| Images / staff photos | Broken image icons | Stored-file URLs dropped `/kwela` (fixed earlier in `f0c9f2e`) |
| Recycle | Restore/purge failed for FAQ groups & downloads | Recycle API only accepted UUID ids; those tables use text slug PKs |
| FAQ delete | Group delete left questions “live” | Group soft-delete did not soft-delete child `faq_items` |
| Messages delete | Failed under `/kwela` | Raw `fetch("/api/messages")` without `appPath` |
| Gallery videos | Could not upload video files | Gallery only accepted YouTube IDs; upload API allowed video MIME only for home hero |

## Fixes implemented (this branch)

### Staff
- `staff-portal/src/app/api/staff/route.ts` — select `admin_module_permissions(...)` and map to `permissions`
- `staff-manager.tsx` — clear error on success; distinguish empty / search-miss / load-failure

### Deletion
- `recycle/route.ts` — accept slug ids for `faq_groups` and `download_items`
- `faq/route.ts` — soft-delete (and purge) child questions with the group
- `messages-inbox.tsx` — DELETE via `appPath`

### Public synchronisation
- `js/ksl-content.js` — `cache: "no-store"`; no stale JSON fallback when portal base is set; `safeMediaUrl()` for HTTP portal hosts
- `js/ksl-live.js` — no stale JSON fallback when portal is configured
- `js/site-images.js`, `js/pages/services.js`, `js/pages/about.js` — use `safeMediaUrl`
- All public CMS routes — `Cache-Control: private, no-cache, no-store, must-revalidate`

### Gallery video files
- Migration `003_gallery_file_videos.sql` — optional `storage_path` / `public_url` / `content_type`; YouTube OR file
- Upload API — gallery video MIME with `x-ksl-gallery-video: 1`
- Gallery API + editor — YouTube **or** MP4/WebM upload (max 50 MB)
- `js/gallery-live.js` — HTML5 `<video>` for file sources; progressive photo loading (24 at a time)

### Performance
- Gallery progressive “Show more” (24 photos/page)
- Public CMS responses no longer shared-cache for 60–300s
- Prefetch already parallel; images already `loading="lazy"`

## Tests performed

| Test | Result |
|------|--------|
| `npm test` (unit) | Pass (43 tests after recycle-id) |
| `npm run test:pg` (disposable embedded Postgres) | Pass — migrations 001–003 applied twice; db-smoke CRUD/auth/storage OK |
| Live API timings (before deploy of this commit) | gallery ~varies, news/org/projects measured from IP |

### Workflow coverage vs request

Safe disposable DB covered: migrations, schema for file videos, smoke CRUD.  
Full browser admin→public E2E against production was **not** run (constraint: do not modify production VPS without authorisation). After you deploy, re-check the checklist in §Expected verification.

## Live API timings (pre-deploy baseline)

Measured against `http://178.162.219.218/kwela/api/public/*`:

| Endpoint | HTTP | Time |
|----------|------|------|
| `/api/public/gallery` | 200 | 0.43s |
| `/api/public/news` | 200 | 0.41s |
| `/api/public/organization` | 200 | 0.50s |
| `/api/public/projects` | 200 | 0.36s |
| `/api/staff` (no cookie) | 401 | expected |

After deploy, re-run the same curls. Sync correctness is the primary gain; gallery first paint improves via progressive loading.

## Files changed (high level)

- Staff API + staff UI
- Recycle + FAQ delete + messages delete
- Public JS content/prefetch/media allow-lists
- Public API cache helper + all CMS public routes
- Gallery schema migration, upload, API, editor, public player
- Guides: this report

## Requires your attention on the VPS (authorisation needed)

Do **not** apply these on production until you approve:

1. `git pull` on `vps-postgres`
2. Run migrator: `npm run db:migrate` (applies `003_gallery_file_videos`)
3. Ensure env has `NEXT_PUBLIC_PORTAL_URL=http://IP/kwela` and `NEXT_PUBLIC_BASE_PATH=/kwela` (`bash deploy/vps/fill-ip.sh --http IP`)
4. Rebuild + restart portal
5. Publish static JS (`publish-public.sh`) so `ksl-content.js` / `gallery-live.js` / page scripts update on `/var/www/...`
6. Reload Nginx from updated `kenyashipyards-ip.conf` (includes `/api/stored-file` → `/kwela/...` redirect from the earlier image fix)

## Expected verification after deploy

1. Staff page loads without error; invite flow works; super-admin preserved  
2. Soft-delete news → disappears from `/api/public/news` without hard refresh  
3. Publish/edit/unpublish reflect on public pages  
4. Gallery: upload JPG; upload MP4; both appear publicly  
5. Recycle restore works for a FAQ group and a download  
6. Organisation photos load via `/kwela/api/stored-file?...`

## Still intentional / not bugs

- Non-publishers’ edits go to review drafts until approved (`DRAFT_SAVED`)  
- News/events with future `go_live_on` stay off the public site until that date  
- Soft-deleted items stay in the recycle bin until permanently purged; media files are only removed when no other row references them  

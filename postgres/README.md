# Standalone PostgreSQL and VPS operations

This branch replaces the staff portal's Supabase database, authentication, and object storage with PostgreSQL, local authentication, and private filesystem storage. The Docker-free setup below is documentation only; no VPS or production service has been contacted or changed.

**Full VPS cutover checklist with exact commands:** [../DEPLOYMENT.md](../DEPLOYMENT.md)

## Migration status and source coverage

`migrations/001_standalone_schema.sql` is the consolidated initial schema for a new PostgreSQL database. The ordered, checksum-verified runner is `staff-portal/scripts/migrate.mjs` (`npm run db:migrate`). It serializes concurrent runs with a PostgreSQL advisory lock and applies each migration transactionally. Never run the historical `../supabase/migrations/*.sql` files against ordinary PostgreSQL: they include Supabase `auth`, `storage`, roles, APIs, and RLS. See [MIGRATION-COVERAGE.md](./MIGRATION-COVERAGE.md) for a per-file source-to-replacement matrix.

| Historical migration | Standalone replacement in `001_standalone_schema.sql` |
|---|---|
| 001 | Profiles/password hashes, content modules, permissions, activity, FAQ/news, updated timestamps |
| 002–006 | Gallery, events/services, careers/downloads, organization/press, products/CSR, settings |
| 007–010 | Username/lockout fields, videos, profile photos, board/first-login fields |
| 011–018 | Messages, image overrides, projects, scheduled publication, password expiry, hero media |
| 019–023 | Sessions, portal support/status history, storage metadata and database-size reporting |
| 024–029 | Recycle metadata, staff references, account requests, role titles, invites |
| 030–035 | Organization chart, board sections/groups, milestones, date precision and ordering |
| 036–043 | Drafts/returns, security follow-up, project details, message IP/risk metadata, organogram |

Supabase Auth and Storage services are replaced by the portal's bcrypt cost-12 passwords, database-backed sessions, WebAuthn passkeys (`002_webauthn_passkeys.sql`), and local-file storage. Supabase-only RLS, grants, RPCs, and service roles are intentionally not copied; authorization is enforced in the application and the runtime database role has no schema-creation privilege. The schema seeds module/settings rows but does not create staff accounts.

**Verification is still required before production.** This environment has no `psql`, `postgres`, or `pg_ctl`; Docker is intentionally not used. The migration SQL, transaction behavior, PostgreSQL CRUD/auth/storage integration, and backup restore have therefore not been executed against a real local PostgreSQL server. Do not treat schema coverage as database-test coverage or deploy until those checks pass.

## Database provisioning (Ubuntu, no Docker)

1. Install a supported PostgreSQL server and its `pgcrypto` extension package using the VPS operating system's package manager. Keep PostgreSQL bound to loopback when the portal runs on the same host; do not expose port 5432 to the internet.
2. Review and run `bootstrap/roles.sql` as the local PostgreSQL administrator. It creates the `ksl` database and dedicated `ksl_migrator` and `ksl_runtime` logins, and intentionally refuses to reuse those role names.
3. Set both role passwords interactively with `\password`; do not put passwords in shell history or command arguments. Store the migrator URL separately from the runtime URL. The portal must use only `ksl_runtime`.
4. Put the schema migrator URL (and its SSL mode) in a separate protected file such as `/etc/ksl-portal-migrator.env`, readable only to the operator/portal service account. Run the runner from `staff-portal` with `MIGRATOR_ENV_FILE` pointing to that file:

   ```sh
   MIGRATOR_ENV_FILE=/etc/ksl-portal-migrator.env npm run db:migrate
   ```

The runner verifies that the connected role is `ksl_migrator`, refuses changed checksums and missing historical migration files, and applies each migration inside its own transaction. Schema changes after this initial schema must be new, ordered SQL files; never edit a migration after it has been applied.

## Application environment

Copy `staff-portal/.env.example` to a root-protected production environment file, fill every secret independently, and set permissions to `600`. The file includes:

- `DATABASE_URL`: runtime login only; use `127.0.0.1` for the local database.
- `DATABASE_POOL_MAX`: runtime connection pool cap.
- `DATABASE_SSL`: `disable` only for loopback/local PostgreSQL, otherwise `verify-full` with a trusted CA and a hostname matching the server certificate.
- `STORAGE_DIR`: writable persistent directory outside the application tree and all public web roots.
- `STORED_FILE_SIGNING_SECRET`, `CONTACT_TOKEN_SECRET`, `MESSAGE_VIEW_UNLOCK_SECRET`: independent random values, at least 32 bytes each.
- `NEXT_PUBLIC_PORTAL_URL`, `NEXT_PUBLIC_SITE_URL`, `PUBLIC_SITE_ORIGIN`: actual HTTPS origins; the CORS value may be comma-separated.
- Turnstile keys and `TRUSTED_PROXY_HOPS`, configured for the actual reverse-proxy topology.

Do not expose database credentials, signing secrets, or `STORAGE_DIR` through `NEXT_PUBLIC_*` variables. Use HTTPS at the reverse proxy. Configure the public static pages' `data-ksl-content-api` attribute to the portal origin and allow only the public website origin in `PUBLIC_SITE_ORIGIN`.

## Files, accounts, and application deployment

- Create a dedicated `ksl-portal` OS user. Give it write access only to `STORAGE_DIR` and the Next.js runtime cache; keep uploaded files outside the static website document root.
- Review `../deploy/vps/ksl-portal.service`, adjust its application path and Node/npm paths to the installed layout, then install it as a systemd unit. It binds Next.js to `127.0.0.1:3000`; configure the existing reverse proxy and TLS separately.
- `../deploy/vps/publish-public.sh` uses `rsync --delete` with `/var/www/ksl` as its default destination. Before running it, verify that this is a dedicated KSL document root, separate from the company's WordPress and osTicket paths; never point `DEST` at an existing site or shared web root.
- Build from a reviewed checkout with `npm ci`; provide the public build-time origins and Turnstile site key to `npm run build` because Next.js embeds `NEXT_PUBLIC_*` values into the build. Do not pass server secrets on the command line. Then start/restart the service with systemd. The unit is a template and is not installed or enabled by this repository.
- Create the initial local super-admin with `npm run bootstrap:admin`. It prompts for a hidden password, stores a bcrypt cost-12 hash, marks the account for a required password change, and refuses to replace an existing super-admin.
- The `staff-portal/scripts/import-*-from-json.mjs` scripts load public seed content from repository JSON files. For an authorized export kept outside Git, use `npm run import:content-export -- /absolute/path/content-export.json`. Its input is `{ "tables": { "news_items": [{ ... }] } }`; it accepts only documented content tables, preserves supplied content IDs and relations, strips audit-user references, and explicitly rejects `auth` data, `encrypted_password`, and `password_hash` fields.
- Copy exported file bodies into an external directory with `media-public/`, `downloads/`, and `avatars/` subdirectories, then use `npm run import:storage-objects -- /absolute/path/object-export`. It rejects links, traversal, unknown extensions, oversize files, and signature mismatches. It writes filesystem objects plus `stored_files` metadata but publishes no URLs, so avatars and downloads remain private.
- No production database rows, staff accounts, or file bodies have been exported or imported. Before cutover, map/validate authorized exports in a staging database and copy files while preserving referenced paths. Do not migrate Supabase password hashes; issue local password resets/invites instead.

## Backup, restore, rollback

Back up both PostgreSQL and `STORAGE_DIR`; a database dump does not contain file bodies. Store encrypted backups outside the web root and VPS, with access controls and a tested retention policy.

Example local PostgreSQL custom-format dump (run as the local database administrator):

```sh
sudo -u postgres pg_dump --format=custom --file=/secure-backups/ksl-YYYYMMDD.dump ksl
```

Restore into a separate empty database first, then verify the application and media paths before cutover:

```sh
sudo -u postgres createdb --owner=ksl_migrator ksl_restore
sudo -u postgres pg_restore --no-owner --role=ksl_migrator --dbname=ksl_restore /secure-backups/ksl-YYYYMMDD.dump
```

Restore the matching filesystem backup with ownership and permissions preserved. For rollback, stop the portal, restore the previous application release and its matching database/filesystem backups, validate, then restart. There are no automatic down-migrations; schema rollback is by restoring a tested backup, not by deleting migration records. Test this procedure before production cutover.

## Validation gate

Run the portal unit tests, TypeScript, lint, production build, dependency audit, and database-backed migration/API/auth/storage tests against a disposable local PostgreSQL database. Exercise a backup restore and verify uploaded public and private files. A deployment archive must not be made until all available checks have passed; exclude `.env*` secrets, `node_modules`, Git history, and local data.

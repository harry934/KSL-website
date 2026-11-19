# VPS Stage 1 status (no Nginx / DNS / public cutover)

## Confirmed from the user-provided inventory

- Ubuntu 24.04.5 LTS, x86_64.
- MySQL is running locally and reportedly has no application data. Leave it installed, running, and unchanged.
- Nginx is not installed.
- PostgreSQL was installed by the user after the initial inventory was shared. Its actual service state, version, database list, listen address, and existing roles have not yet been inspected by this task.
- The user requests a private Stage 1 deployment via SSH tunnel. Do not expose the portal login on plain HTTP at the public IP.

## Local PostgreSQL verification

Run on VPS and share output with secrets omitted:

```sh
systemctl status postgresql --no-pager
psql --version
sudo -u postgres psql -c 'SELECT version();'
sudo -u postgres psql -Atc 'SHOW listen_addresses;'
sudo -u postgres psql -Atc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"
sudo -u postgres psql -Atc "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles ORDER BY rolname;"
sudo ss -lntp | grep -E ':(5432)\\b' || true
systemctl is-active mysql || true
sudo ss -lntp | grep -E ':(3306|33060)\\b' || true
```

Do not send credential values. Do not run `postgres/bootstrap/roles.sql` until confirming the names `ksl`, `ksl_migrator`, and `ksl_runtime` are unused and PostgreSQL is loopback-only. Do not apply historical `supabase/migrations/*.sql` files to the VPS.

## Current implementation status

Implemented on `vps-postgres` (not deployed):

- `postgres/migrations/001_standalone_schema.sql`, role bootstrap SQL, a checksum-verified/advisory-lock migration runner, and [per-source migration coverage](../postgres/MIGRATION-COVERAGE.md).
- Server-only PostgreSQL runtime access using `DATABASE_URL`, dedicated migrator/runtime roles, local bcrypt cost-12 password hashes, SHA-256-hashed random session tokens, single live session records, and staff/invite/reset flows.
- Filesystem-only object storage under `STORAGE_DIR`, with controlled public media delivery and authorization/signed links for avatars/downloads.
- Supabase SDK packages, environment keys, and runtime clients were removed. Local bcrypt password auth, database sessions, and WebAuthn passkeys (PostgreSQL `webauthn_*` tables via migration `002`) remain. Historical Supabase migrations/docs remain as source history only.

Local verification completed from the `vps-postgres` worktree on 18 November 2026:

- `npm ci --ignore-scripts` — completed.
- `npm test` — 32 passing tests.
- `npm run lint` — completed with 12 existing warnings and no errors.
- `npx tsc --noEmit` — completed with no diagnostics.
- `npm audit` — completed; 13 high-severity transitive dependency findings remain. The offered automated fix is breaking (`eslint-config-next` downgrade), so it was not applied.
- `npm run build` without public origins — correctly fails because `NEXT_PUBLIC_SITE_URL` is required in production. `NEXT_PUBLIC_SITE_URL=https://www.kenyashipyards.example NEXT_PUBLIC_PORTAL_URL=https://portal.kenyashipyards.example npm run build` — passed. Use the real public origins at deployment build time; do not pass secrets on the command line.
- `import:content-export` and `import:storage-objects` — syntax-checked; both reject repository/deployment-tree input before opening a database connection. They still require disposable-PostgreSQL integration coverage.

Disposable PostgreSQL verification was added as `npm run test:pg` (embedded PostgreSQL; no system package install required). On 19 November 2026 it applied `001_standalone_schema` twice (second run no-op), reported 42 public tables, and passed `db-smoke` CRUD/auth/storage checks. No VPS, MySQL service, Nginx, DNS, Vercel project, or Supabase project has been accessed or changed from this workspace.

## Next gate

1. On the VPS, follow [../DEPLOYMENT.md](../DEPLOYMENT.md): verify PostgreSQL, run `postgres/bootstrap/roles.sql`, migrate with `MIGRATOR_ENV_FILE`, build, and start `ksl-portal`.
2. Optionally exercise `import:content-export` / `import:storage-objects` against a disposable database and an authorized off-repo export.
3. Keep MySQL untouched. Nginx/certificates/DNS/public cutover remain Stage 2 after private SSH-tunnel validation.

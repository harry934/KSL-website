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

Do not send credential values. Do not run `postgres/bootstrap/roles.sql` until confirming the names `ksl`, `ksl_migrator`, and `ksl_runtime` are unused and PostgreSQL is loopback-only. Do not apply any application schema yet: the standalone schema and runner are not implemented.

## Current implementation status

The branch currently has no converted `postgres/migrations/` schema, no Postgres migration runner, no Postgres app data layer, no local authentication conversion, and no fully converted filesystem-only storage. Existing runtime still imports Supabase; the checked `staff-portal/package.json` contains Supabase SDK packages and does not contain `pg`, `bcryptjs`, or `mysql2`. Do not deploy it as a standalone app. Historical `supabase/migrations/` remain unchanged.

## Next gate

First complete repository schema/application conversion and tests. Then verify this PostgreSQL instance and provision database roles. Import/export packages and live VPS deployment require the user's private local exports and SSH access; keep all exports and secrets outside Git.

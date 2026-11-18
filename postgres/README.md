# PostgreSQL migration workspace (in progress)

The self-hosted application migration is not complete. Do not deploy the portal from this branch as a Supabase-independent replacement yet, and do not run the old `supabase/migrations/*.sql` files against the VPS database.

## Source of truth and progress

The existing schema history remains under `../supabase/migrations/`, ordered `001` through `043`. Those migrations contain the business schema and historical Supabase-specific auth, storage, policy, and grant definitions. They are source history only; ordinary PostgreSQL on the VPS does not provide Supabase's `auth` or `storage` schemas, roles, or API/RLS behavior.

A complete port must audit each migration and every application query, then create an ordered standalone migration set here. No converted migration set or migration runner is present yet. The initial schema conversion is therefore outstanding. Keep this warning until coverage, migration tests, and application query conversion are complete.

## Required coverage inventory

Before declaring the schema port complete, account for every migration listed below in order. For each file, document the objects changed, the standalone PostgreSQL replacement, any intentionally omitted Supabase-only behavior, and the test that validates it.

| Source migrations | Area | Status |
|---|---|---|
| 001 | Core staff profiles, permissions, activity, FAQ, news, updated-at function; Supabase Auth/Storage/RLS/grants | Not ported |
| 002–006 | Gallery, events/services, careers/downloads, organization/press, products/CSR/settings and dashboard counts | Not ported |
| 007–013 | Usernames, lockout, videos, profile photos, first login, messages, file/settings/security | Not ported |
| 014–018 | Projects/board seeds, scheduled news, API grants, one-time password expiry, hero media | Not ported |
| 019–023 | Sessions, portal support, session client, storage usage, database size | Not ported |
| 024–029 | Recycle bin, staff recycle/FK semantics, account requests, role title, storage metadata, invites | Not ported |
| 030–035 | Organization chart, board sections/groups, milestones, chart/ordering | Not ported |
| 036–043 | Drafts, draft returns, security follow-up, project details, message risk/IP, board groups, organogram | Not ported |

This grouped inventory is only a tracking aid. Inspect each source file individually; do not treat grouping as proof of full coverage.

## Standalone PostgreSQL design constraints

- Use local UUID `admin_profiles.id` primary keys, `password_hash`, and the existing profile flags; do not import Supabase `auth.users.encrypted_password` or use Supabase Auth hashes.
- Keep content UUIDs, relationships, and storage paths where valid so import mapping remains stable.
- Preserve the existing `ON DELETE SET NULL` history references and `ON DELETE CASCADE` account-owned permission/invite relations as established by the source history.
- Use app-side authorization and least-privilege PostgreSQL roles. Do not create fake `anon`, `authenticated`, `service_role`, Supabase `auth`/`storage` schemas, or blindly copy RLS policies.
- Preserve published/draft/go-live/deleted filters in public APIs. Gallery public endpoint stays empty.
- Filesystem media is not stored in PostgreSQL. Private files must be authorization-checked by the app.
- Seed content module rows, but create no staff accounts through SQL. The separate one-time bootstrap must refuse to replace any existing super-admin.

## VPS database roles bootstrap

`bootstrap/roles.sql` provisions the empty `ksl` database and two dedicated roles on an already-installed local PostgreSQL server. Review it before execution. It does not configure PostgreSQL networking, install packages, migrate content, or create an admin. It refuses to reuse pre-existing role names, to avoid taking ownership of unrelated database identities. It requires execution as the local PostgreSQL administrator and leaves role passwords unset for interactive `\password` setup.

Once an audited, tested migration runner exists, the migrator role will own the application schema and the runtime role will receive only the privileges needed by the app. Do not use the migrator credentials in the running Next.js service.

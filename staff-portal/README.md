# KSL staff portal

The portal is a Next.js application using standalone PostgreSQL, local Argon2id authentication, database-backed sessions, and filesystem storage. It no longer requires Supabase services or Docker.

## Local development

1. Install Node.js 20 or newer and PostgreSQL.
2. Create a local database and runtime/migrator roles; see [PostgreSQL and VPS operations](../postgres/README.md).
3. Copy `.env.example` to `.env.local`, configure `DATABASE_URL`, the public origins, and independent random secrets. Never commit populated env files.
4. Install dependencies and migrate the database:

   ```sh
   npm ci
   npm run db:migrate
   npm run bootstrap:admin
   ```

5. Start the portal:

   ```sh
   npm run dev
   ```

The bootstrap command prompts for a username and hidden password, hashes it with Argon2id, and refuses to replace an existing super-admin.

## Production and data import

Use the [PostgreSQL and VPS operations guide](../postgres/README.md) for role provisioning, environment files, deployment, backups, restore, rollback, and the systemd service. Configure the static website's `data-ksl-content-api` origin to the portal URL and include that website origin in `PUBLIC_SITE_ORIGIN`.

The `scripts/import-*-from-json.mjs` tools import public content from the repository's JSON files into PostgreSQL. They do not export or migrate production Supabase data or stored file contents. Existing private staff accounts must be provisioned/reset locally; never copy Supabase password hashes into the local authentication schema.

## Checks

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Database-dependent migration and API integration checks require a local PostgreSQL instance; they must not be pointed at production data during development.

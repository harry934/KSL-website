/**
 * Starts a disposable embedded PostgreSQL cluster, provisions ksl roles,
 * applies migrations twice, and runs db-smoke. Does not touch any remote DB.
 *
 * Usage (from staff-portal):
 *   npm run test:pg
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(os.tmpdir(), `ksl-pg-test-${process.pid}`);
const envFile = path.join(dataDir, "migrator.env");
const adminPassword = "local-admin-test-only";
const migratorPassword = "local-migrator-test-only";
const runtimePassword = "local-runtime-test-only";

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
    server.on("error", reject);
  });
}

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, ...env };
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete childEnv[key];
    }
    const child = spawn(command, args, {
      cwd: root,
      env: childEnv,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

await rm(dataDir, { recursive: true, force: true });
await mkdir(dataDir, { recursive: true, mode: 0o700 });
const port = await freePort();

const cluster = new EmbeddedPostgres({
  databaseDir: path.join(dataDir, "cluster"),
  user: "postgres",
  password: adminPassword,
  port,
  persistent: false,
  autoRehydrateSymlinks: true,
});

let started = false;
try {
  console.info(`Starting disposable PostgreSQL on 127.0.0.1:${port}`);
  await cluster.initialise();
  await cluster.start();
  started = true;

  const admin = new pg.Client({
    host: "127.0.0.1",
    port,
    user: "postgres",
    password: adminPassword,
    database: "postgres",
  });
  await admin.connect();
  try {
    await admin.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    // CREATE ROLE does not accept bind parameters for PASSWORD.
    await admin.query(`CREATE ROLE ksl_migrator LOGIN PASSWORD '${migratorPassword.replace(/'/g, "''")}'`);
    await admin.query(`CREATE ROLE ksl_runtime LOGIN PASSWORD '${runtimePassword.replace(/'/g, "''")}'`);
    await admin.query("CREATE DATABASE ksl OWNER ksl_migrator ENCODING 'UTF8'");
    await admin.query("REVOKE ALL ON DATABASE ksl FROM PUBLIC");
    await admin.query("GRANT CONNECT ON DATABASE ksl TO ksl_runtime");
  } finally {
    await admin.end();
  }

  const asMigrator = new pg.Client({
    host: "127.0.0.1",
    port,
    user: "ksl_migrator",
    password: migratorPassword,
    database: "ksl",
  });
  await asMigrator.connect();
  try {
    await asMigrator.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await asMigrator.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    await asMigrator.query("GRANT USAGE ON SCHEMA public TO ksl_runtime");
  } finally {
    await asMigrator.end();
  }

  const migratorUrl = `postgresql://ksl_migrator:${encodeURIComponent(migratorPassword)}@127.0.0.1:${port}/ksl`;
  const runtimeUrl = `postgresql://ksl_runtime:${encodeURIComponent(runtimePassword)}@127.0.0.1:${port}/ksl`;
  await writeFile(
    envFile,
    [
      `DATABASE_URL=${migratorUrl}`,
      "DATABASE_SSL=disable",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  console.info("Applying migrations (first run)...");
  await run("node", ["scripts/migrate.mjs"], {
    MIGRATOR_ENV_FILE: envFile,
    DATABASE_URL: undefined,
  });

  console.info("Applying migrations (second run — should be a no-op)...");
  await run("node", ["scripts/migrate.mjs"], {
    MIGRATOR_ENV_FILE: envFile,
    DATABASE_URL: undefined,
  });

  const verify = new pg.Client({ connectionString: runtimeUrl });
  await verify.connect();
  try {
    const versions = await verify.query(
      "SELECT version FROM public.schema_migrations ORDER BY version",
    );
    console.info(
      `schema_migrations: ${versions.rows.map((row) => row.version).join(", ") || "(none)"}`,
    );
    const tableCount = await verify.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.info(`public tables: ${tableCount.rows[0].count}`);
  } finally {
    await verify.end();
  }

  console.info("Running db-smoke as ksl_runtime...");
  await run("node", ["scripts/db-smoke.mjs"], {
    DATABASE_URL: runtimeUrl,
    DATABASE_SSL: "disable",
    STORAGE_DIR: path.join(dataDir, "files"),
  });

  console.info("Dry-run content import outside the repository...");
  const exportDir = path.join(os.tmpdir(), `ksl-content-export-${process.pid}`);
  await mkdir(exportDir, { recursive: true, mode: 0o700 });
  const exportFile = path.join(exportDir, "content-export.json");
  const newsId = "11111111-1111-4111-8111-111111111111";
  await writeFile(
    exportFile,
    JSON.stringify({
      tables: {
        news_items: [
          {
            id: newsId,
            title: "Import dry-run",
            slug: "import-dry-run",
            excerpt: "Disposable import check",
            body_html: "<p>ok</p>",
            status: "published",
            published_date: "2026-01-01",
          },
        ],
      },
    }),
    { mode: 0o600 },
  );
  await run("node", ["scripts/import-content-export.mjs", exportFile], {
    DATABASE_URL: runtimeUrl,
    DATABASE_SSL: "disable",
  });
  const verifyImport = new pg.Client({ connectionString: runtimeUrl });
  await verifyImport.connect();
  try {
    const imported = await verifyImport.query(
      "SELECT title, status FROM public.news_items WHERE id = $1",
      [newsId],
    );
    if (imported.rows[0]?.title !== "Import dry-run" || imported.rows[0]?.status !== "published") {
      throw new Error("content export import dry-run did not upsert news_items");
    }
    const galleryPublic = await verifyImport.query(
      `SELECT COUNT(*)::int AS count FROM public.gallery_photos
       WHERE status = 'published' AND deleted_at IS NULL`,
    );
    if (typeof galleryPublic.rows[0].count !== "number") {
      throw new Error("gallery public filter query failed");
    }
  } finally {
    await verifyImport.end();
  }
  await rm(exportDir, { recursive: true, force: true });

  console.info("local-pg-test OK");
} finally {
  if (started) {
    try {
      await cluster.stop();
    } catch (error) {
      console.error("Failed to stop embedded PostgreSQL", error);
    }
  }
  await rm(dataDir, { recursive: true, force: true });
}

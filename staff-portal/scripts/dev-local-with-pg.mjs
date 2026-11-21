/**
 * Local portal + disposable embedded PostgreSQL (no VPS / no system Postgres).
 *
 * Usage (from staff-portal):
 *   node scripts/dev-local-with-pg.mjs
 *
 * Opens http://127.0.0.1:3000/kwela
 * Default admin (created if missing): localadmin / LocalTest1!
 */
import { mkdir, writeFile, access, rm } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(os.tmpdir(), "ksl-portal-local-dev");
const storageDir = path.join(dataDir, "files");
const envFile = path.join(dataDir, "migrator.env");

const adminPassword = "local-admin-test-only";
const migratorPassword = "local-migrator-test-only";
const runtimePassword = "local-runtime-test-only";
const portalUser = "localadmin";
const portalPass = "LocalTest1!";
/** Fixed port so a reused cluster data dir matches postgresql.conf. */
const pgPort = 55432;
const resetDb = process.argv.includes("--reset");

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

function secret() {
  return randomBytes(48).toString("base64");
}

if (resetDb) {
  console.info("Resetting local embedded PostgreSQL data…");
  await rm(dataDir, { recursive: true, force: true });
}
await mkdir(dataDir, { recursive: true, mode: 0o700 });
await mkdir(storageDir, { recursive: true, mode: 0o700 });

const clusterDir = path.join(dataDir, "cluster");
const cluster = new EmbeddedPostgres({
  databaseDir: clusterDir,
  user: "postgres",
  password: adminPassword,
  port: pgPort,
  persistent: true,
  autoRehydrateSymlinks: true,
});

let started = false;
let nextChild = null;

async function shutdown() {
  if (nextChild && !nextChild.killed) {
    nextChild.kill("SIGTERM");
    nextChild = null;
  }
  if (started) {
    try {
      await cluster.stop();
    } catch {
      /* ignore */
    }
    started = false;
  }
}

process.on("SIGINT", () => {
  shutdown().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  shutdown().finally(() => process.exit(0));
});

try {
  let fresh = false;
  try {
    await access(path.join(clusterDir, "PG_VERSION"));
    console.info("Reusing local embedded PostgreSQL…");
  } catch {
    fresh = true;
    console.info("Initialising local embedded PostgreSQL…");
    await cluster.initialise();
  }
  await cluster.start();
  started = true;

  if (fresh) {
    const admin = new pg.Client({
      host: "127.0.0.1",
      port: pgPort,
      user: "postgres",
      password: adminPassword,
      database: "postgres",
    });
    await admin.connect();
    try {
      await admin.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
      await admin.query(
        `CREATE ROLE ksl_migrator LOGIN PASSWORD '${migratorPassword.replace(/'/g, "''")}'`
      );
      await admin.query(
        `CREATE ROLE ksl_runtime LOGIN PASSWORD '${runtimePassword.replace(/'/g, "''")}'`
      );
      await admin.query("CREATE DATABASE ksl OWNER ksl_migrator ENCODING 'UTF8'");
      await admin.query("REVOKE ALL ON DATABASE ksl FROM PUBLIC");
      await admin.query("GRANT CONNECT ON DATABASE ksl TO ksl_runtime");
    } finally {
      await admin.end();
    }

    const asMigrator = new pg.Client({
      host: "127.0.0.1",
      port: pgPort,
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
  }

  const migratorUrl = `postgresql://ksl_migrator:${encodeURIComponent(migratorPassword)}@127.0.0.1:${pgPort}/ksl`;
  const runtimeUrl = `postgresql://ksl_runtime:${encodeURIComponent(runtimePassword)}@127.0.0.1:${pgPort}/ksl`;

  await writeFile(
    envFile,
    [`DATABASE_URL=${migratorUrl}`, "DATABASE_SSL=disable", ""].join("\n"),
    { mode: 0o600 }
  );

  console.info("Applying migrations…");
  await run("node", ["scripts/migrate.mjs"], {
    MIGRATOR_ENV_FILE: envFile,
    DATABASE_URL: undefined,
  });

  const app = new pg.Client({ connectionString: migratorUrl });
  await app.connect();
  try {
    const existing = await app.query(
      "SELECT id FROM public.admin_profiles WHERE username = $1 AND deleted_at IS NULL LIMIT 1",
      [portalUser]
    );
    if (!existing.rowCount) {
      const hash = await bcrypt.hash(portalPass, 12);
      await app.query(
        `INSERT INTO public.admin_profiles
          (id, username, password_hash, display_name, is_super_admin, is_active, must_change_password)
         VALUES ($1, $2, $3, $4, true, true, false)`,
        [randomUUID(), portalUser, hash, "Local Admin"]
      );
      console.info(`Created local admin: ${portalUser} / ${portalPass}`);
    } else {
      console.info(`Local admin ready: ${portalUser} / ${portalPass}`);
    }
  } finally {
    await app.end();
  }

  const env = {
    DATABASE_URL: runtimeUrl,
    DATABASE_POOL_MAX: "5",
    DATABASE_SSL: "disable",
    STORAGE_DIR: storageDir,
    STORED_FILE_SIGNING_SECRET: secret(),
    CONTACT_TOKEN_SECRET: secret(),
    MESSAGE_VIEW_UNLOCK_SECRET: secret(),
    NEXT_PUBLIC_BASE_PATH: "/kwela",
    NEXT_PUBLIC_PORTAL_URL: "http://127.0.0.1:3000/kwela",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
    PUBLIC_SITE_ORIGIN: "http://127.0.0.1:3000",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    TURNSTILE_SECRET_KEY: "",
    TRUSTED_PROXY_HOPS: "0",
    NODE_ENV: "development",
  };

  console.info("");
  console.info("Starting Next.js dev server…");
  console.info("  Portal:  http://127.0.0.1:3000/kwela");
  console.info(`  Login:   ${portalUser} / ${portalPass}`);
  console.info("  Then:    Website images → home hero → Upload video");
  console.info("  Expect:  original speed + original quality (no browser re-encode)");
  console.info("");

  nextChild = spawn("npx", ["next", "dev", "-H", "127.0.0.1", "-p", "3000"], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  await new Promise((resolve, reject) => {
    nextChild.on("error", reject);
    nextChild.on("exit", (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`next dev exited with ${code}`));
    });
  });
} catch (err) {
  console.error(err);
  await shutdown();
  process.exit(1);
} finally {
  await shutdown();
}

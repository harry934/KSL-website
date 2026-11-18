import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../postgres/migrations");
const envFile = process.env.MIGRATOR_ENV_FILE;
if (envFile) {
  if (!existsSync(envFile)) throw new Error(`MIGRATOR_ENV_FILE does not exist: ${envFile}`);
  const contents = readFileSync(envFile, "utf8").replace(/^\uFEFF/, "");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(separator + 1).trim();
  }
}
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run migrations");
}
const sslMode = process.env.DATABASE_SSL ?? "disable";
if (sslMode !== "disable" && sslMode !== "verify-full") {
  throw new Error("DATABASE_SSL must be either disable or verify-full");
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 5_000,
  application_name: "ksl-schema-migrator",
  ssl: sslMode === "verify-full" ? { rejectUnauthorized: true } : undefined,
});
let lockAcquired = false;

try {
  const client = await pool.connect();
  try {
    const identity = await client.query("SELECT current_user");
    if (identity.rows[0]?.current_user !== "ksl_migrator") {
      throw new Error("Run schema migrations with the ksl_migrator database role");
    }
    await client.query("SELECT pg_advisory_lock($1, $2)", [1296780115, 1]);
    lockAcquired = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(root))
      .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
      .sort();
    const appliedRows = await client.query("SELECT version, checksum FROM public.schema_migrations");
    const applied = new Map(appliedRows.rows.map((row) => [row.version, row.checksum]));
    const localVersions = new Set(files.map((file) => file.slice(0, -4)));
    for (const version of applied.keys()) {
      if (!localVersions.has(version)) throw new Error(`Applied migration ${version} has no matching local file`);
    }

    for (const file of files) {
      const version = file.slice(0, -4);
      const sql = await readFile(path.join(root, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previous = applied.get(version);
      if (previous) {
        if (previous !== checksum) throw new Error(`Applied migration ${version} has changed`);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO public.schema_migrations (version, checksum) VALUES ($1, $2)",
          [version, checksum],
        );
        await client.query("COMMIT");
        console.info(`Applied ${version}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${version} failed; no migration record was written`, { cause: error });
      }
    }
    console.info(`Database is current (${files.length} migration file(s)).`);
  } finally {
    if (lockAcquired) await client.query("SELECT pg_advisory_unlock($1, $2)", [1296780115, 1]);
    client.release();
  }
} finally {
  await pool.end();
}

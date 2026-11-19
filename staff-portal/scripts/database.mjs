import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDir, "../.env.local");
if (existsSync(envPath)) {
  const contents = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(separator + 1).trim();
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required; set it in the environment or staff-portal/.env.local");
}
const sslMode = process.env.DATABASE_SSL ?? "disable";
if (sslMode !== "disable" && sslMode !== "verify-full") {
  throw new Error("DATABASE_SSL must be either disable or verify-full");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 1000,
  allowExitOnIdle: true,
  application_name: "ksl-content-import",
  ssl: sslMode === "verify-full" ? { rejectUnauthorized: true } : undefined,
});

export const query = (text, values = []) => pool.query(text, values);

export async function closePool() {
  await pool.end();
}

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const identifiers = /^[a-z_][a-z0-9_]*$/i;
const defaultConflicts = {
  news_items: ["slug"],
  event_items: ["slug"],
  service_items: ["slug"],
  products: ["slug"],
  csr_projects: ["slug"],
  admin_profiles: ["id"],
  faq_groups: ["id"],
  faq_items: ["id"],
  download_items: ["id"],
};
const jsonbColumns = {
  services_settings: new Set(["download_catalog", "group_order"]),
  service_items: new Set(["downloads"]),
  products_settings: new Set(["range_groups"]),
  products: new Set(["key_specs", "extra_specs"]),
  csr_settings: new Set(["badges", "hero_images", "stats"]),
  organization_settings: new Set(["chart", "board_sections", "board_groups"]),
  site_settings: new Set(["value"]),
};

function quote(identifier) {
  if (!identifiers.test(identifier)) throw new Error(`Invalid database identifier: ${identifier}`);
  return `"${identifier}"`;
}

async function insert(table, rows, conflictColumns) {
  if (!identifiers.test(table)) throw new Error(`Invalid database table: ${table}`);
  const batch = Array.isArray(rows) ? rows : [rows];
  if (!batch.length) return { data: [], error: null };
  const columns = Object.keys(batch[0]);
  if (!columns.length || batch.some((row) =>
    Object.keys(row).length !== columns.length || columns.some((column) => !(column in row))
  )) {
    throw new Error(`Invalid or inconsistent rows for ${table}`);
  }
  const parameters = [];
  const tuples = batch.map((row) => `(${columns.map((column) => {
    const isJson = jsonbColumns[table]?.has(column);
    parameters.push(isJson && row[column] !== null ? JSON.stringify(row[column]) : row[column]);
    return `$${parameters.length}${isJson ? "::jsonb" : ""}`;
  }).join(", ")})`);
  const conflict = conflictColumns?.length ? conflictColumns : null;
  const update = conflict
    ? columns.filter((column) => !conflict.includes(column))
    : [];
  const onConflict = conflict
    ? ` ON CONFLICT (${conflict.map(quote).join(", ")}) DO ${update.length
      ? `UPDATE SET ${update.map((column) => `${quote(column)} = EXCLUDED.${quote(column)}`).join(", ")}`
      : "NOTHING"}`
    : "";
  const result = await pool.query(
    `INSERT INTO public.${quote(table)} (${columns.map(quote).join(", ")}) VALUES ${tuples.join(", ")}${onConflict}`,
    parameters,
  );
  return { data: result.rows, error: null };
}

export function createDatabaseAdmin() {
  return {
    from(table) {
      if (!identifiers.test(table)) throw new Error(`Invalid database table: ${table}`);
      return {
        async select(columns = "*") {
          const selection = columns === "*" ? "*" : columns.split(",").map((column) => quote(column.trim())).join(", ");
          const result = await pool.query(`SELECT ${selection} FROM public.${quote(table)}`);
          return { data: result.rows, error: null };
        },
        async insert(rows) {
          return insert(table, rows);
        },
        async upsert(rows, options = {}) {
          const firstRow = Array.isArray(rows) ? rows[0] : rows;
          const conflicts = options.onConflict
            ? options.onConflict.split(",").map((column) => column.trim())
            : defaultConflicts[table] ?? (firstRow?.id ? ["id"] : []);
          if (!conflicts.length) throw new Error(`No conflict key is configured for ${table}`);
          return insert(table, rows, conflicts);
        },
      };
    },
  };
}

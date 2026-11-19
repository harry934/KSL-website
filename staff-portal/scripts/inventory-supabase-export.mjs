/**
 * Read-only inventory / optional content JSON export from the historical Supabase
 * Postgres database. Never writes to the source. Never commits secrets.
 *
 * Required:
 *   SOURCE_DATABASE_URL  — Postgres URI for the Supabase project (read-only preferred)
 *
 * Optional storage listing:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional JSON export (must be an absolute path OUTSIDE this repository):
 *   EXPORT_PATH=/absolute/path/outside-repo/content-export.json
 *
 * Usage:
 *   SOURCE_DATABASE_URL=... node scripts/inventory-supabase-export.mjs
 *   SOURCE_DATABASE_URL=... EXPORT_PATH=/tmp/ksl-content-export.json node scripts/inventory-supabase-export.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const CONTENT_TABLES = [
  "services_settings", "careers_settings", "downloads_settings", "organization_settings",
  "press_settings", "products_settings", "projects_settings", "csr_settings", "site_settings",
  "site_image_overrides", "faq_groups", "faq_items", "news_items", "gallery_photos",
  "gallery_videos", "event_items", "service_items", "career_listings", "download_items",
  "organization_leadership", "organization_yards", "organization_board_members",
  "organization_milestones", "press_assets", "products", "projects", "csr_projects",
  "website_messages", "content_drafts", "draft_returns",
];

const STORAGE_BUCKETS = ["media-public", "downloads", "avatars"];

function isOutsideRepository(value) {
  const resolved = path.resolve(value);
  return resolved !== repositoryRoot && !resolved.startsWith(`${repositoryRoot}${path.sep}`);
}

const sourceUrl = process.env.SOURCE_DATABASE_URL?.trim();
if (!sourceUrl) {
  console.error("SOURCE_DATABASE_URL is required (Supabase Postgres URI, read-only preferred).");
  console.error("If Supabase is unavailable, inventory repo data/*.json + img/ksl instead — see guides/POST-DEPLOY-AUDIT.md");
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//i.test(sourceUrl)) {
  console.error("SOURCE_DATABASE_URL must use the PostgreSQL protocol");
  process.exit(1);
}

const exportPath = process.env.EXPORT_PATH?.trim();
if (exportPath) {
  if (!path.isAbsolute(exportPath)) {
    console.error("EXPORT_PATH must be an absolute path outside the repository");
    process.exit(1);
  }
  if (!isOutsideRepository(exportPath)) {
    console.error("EXPORT_PATH must be outside the repository and deployment tree");
    process.exit(1);
  }
}

const client = new pg.Client({
  connectionString: sourceUrl,
  connectionTimeoutMillis: 15_000,
  statement_timeout: 60_000,
  application_name: "ksl-supabase-inventory-readonly",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const tables = {};
try {
  await client.query("SET default_transaction_read_only = on");
  await client.query("BEGIN READ ONLY");

  console.log("Supabase source inventory (read-only)");
  console.log("---");
  for (const table of CONTENT_TABLES) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(table)) throw new Error(`Invalid table ${table}`);
    try {
      const countResult = await client.query(`SELECT COUNT(*)::int AS count FROM public."${table}"`);
      const count = countResult.rows[0].count;
      console.log(`${table}\t${count}`);
      if (exportPath && count > 0) {
        const rows = await client.query(`SELECT * FROM public."${table}"`);
        tables[table] = rows.rows.map((row) => {
          const copy = { ...row };
          delete copy.encrypted_password;
          delete copy.password_hash;
          return copy;
        });
      } else if (exportPath) {
        tables[table] = [];
      }
    } catch (error) {
      console.log(`${table}\tMISSING_OR_ERROR\t${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Staff profile count only — never export password hashes / auth schema.
  try {
    const profiles = await client.query(`SELECT COUNT(*)::int AS count FROM public.admin_profiles`);
    console.log(`admin_profiles\t${profiles.rows[0].count}\t(count only; not exported)`);
  } catch (error) {
    console.log(`admin_profiles\tERROR\t${error instanceof Error ? error.message : String(error)}`);
  }

  await client.query("COMMIT");
} catch (error) {
  try { await client.query("ROLLBACK"); } catch { /* ignore */ }
  throw error;
} finally {
  await client.end();
}

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (supabaseUrl && serviceKey) {
  console.log("---");
  console.log("Storage object listing (read-only)");
  for (const bucket of STORAGE_BUCKETS) {
    let total = 0;
    let offset = 0;
    const pageSize = 100;
    try {
      for (;;) {
        const res = await fetch(`${supabaseUrl}/storage/v1/object/list/${bucket}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prefix: "", limit: pageSize, offset }),
        });
        if (!res.ok) {
          console.log(`${bucket}\tERROR\tHTTP ${res.status}`);
          break;
        }
        const items = await res.json();
        if (!Array.isArray(items) || !items.length) break;
        total += items.length;
        offset += items.length;
        if (items.length < pageSize) break;
      }
      console.log(`${bucket}\t${total}`);
    } catch (error) {
      console.log(`${bucket}\tERROR\t${error instanceof Error ? error.message : String(error)}`);
    }
  }
} else {
  console.log("---");
  console.log("Storage listing skipped (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to list buckets).");
}

if (exportPath) {
  const payload = {
    exported_at: new Date().toISOString(),
    source: "supabase-readonly",
    tables,
  };
  await writeFile(exportPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  console.log("---");
  console.log(`Wrote content export to ${exportPath}`);
  console.log("Review the map in guides/POST-DEPLOY-AUDIT.md before running import:content-export.");
}

console.log("---");
console.log("No source data was modified.");

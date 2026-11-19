/**
 * Import a reviewed content-only JSON export from outside the repository.
 * Usage: node scripts/import-content-export.mjs /absolute/path/content-export.json
 *
 * Expected shape: { "tables": { "news_items": [{ ... }], ... } }.
 * This deliberately refuses auth exports and password hashes. Staff accounts must be
 * created through the local invitation/bootstrap flow, never copied from Supabase.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withTransaction } from "./database.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "../..");
const input = process.argv[2];
const identifier = /^[a-z_][a-z0-9_]*$/i;

const TABLE_ORDER = [
  "services_settings", "careers_settings", "downloads_settings", "organization_settings",
  "press_settings", "products_settings", "projects_settings", "csr_settings", "site_settings",
  "site_image_overrides", "faq_groups", "faq_items", "news_items", "gallery_photos",
  "gallery_videos", "event_items", "service_items", "career_listings", "download_items",
  "organization_leadership", "organization_yards", "organization_board_members",
  "organization_milestones", "press_assets", "products", "projects", "csr_projects",
  "website_messages", "content_drafts", "draft_returns",
];
const CONFLICT_KEYS = {
  site_settings: ["key"],
  site_image_overrides: ["slot_id"],
  services_settings: ["id"], careers_settings: ["id"], downloads_settings: ["id"],
  organization_settings: ["id"], press_settings: ["id"], products_settings: ["id"],
  projects_settings: ["id"], csr_settings: ["id"], faq_groups: ["id"], download_items: ["id"],
  news_items: ["slug"],
  event_items: ["slug"],
  service_items: ["slug"],
  products: ["slug"],
  projects: ["slug"],
  csr_projects: ["slug"],
};
const AUDIT_COLUMNS = new Set(["updated_by", "created_by", "actor_id", "author_id", "reviewer_id", "submitted_by", "resolved_by"]);
const JSONB_COLUMNS = {
  services_settings: new Set(["download_catalog", "group_order"]),
  service_items: new Set(["downloads"]),
  products_settings: new Set(["range_groups"]),
  products: new Set(["key_specs", "extra_specs"]),
  csr_settings: new Set(["badges", "hero_images", "stats"]),
  organization_settings: new Set(["chart", "board_sections", "board_groups"]),
  projects_settings: new Set(["group_order"]),
  site_settings: new Set(["value"]),
  site_image_overrides: new Set(["media"]),
};

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: node scripts/import-content-export.mjs /absolute/path/content-export.json");
  process.exit(1);
}
function quoted(value) {
  if (!identifier.test(value)) throw new Error("Invalid identifier in import");
  return `"${value}"`;
}
function isOutsideRepository(value) {
  const resolved = path.resolve(value);
  return resolved !== repositoryRoot && !resolved.startsWith(`${repositoryRoot}${path.sep}`);
}
function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function rejectAuthData(value, trail = "export") {
  if (Array.isArray(value)) return value.forEach((item, index) => rejectAuthData(item, `${trail}[${index}]`));
  if (!plainObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (key.toLowerCase() === "encrypted_password" || key.toLowerCase() === "password_hash") {
      throw new Error(`Refusing credential data at ${trail}.${key}; issue local password resets instead`);
    }
    rejectAuthData(item, `${trail}.${key}`);
  }
}

if (!input || !path.isAbsolute(input)) usage("Provide an absolute export path.");
if (!isOutsideRepository(input)) usage("The export must be outside the repository and deployment tree.");

const parsed = JSON.parse(await readFile(path.resolve(input), "utf8"));
const tables = plainObject(parsed?.tables) ? parsed.tables : parsed;
if (!plainObject(tables)) throw new Error("Export must be an object or { tables: object }");
rejectAuthData(tables);
for (const table of Object.keys(tables)) {
  if (table === "auth" || table.startsWith("auth.")) throw new Error("Supabase auth exports are not accepted");
  if (!TABLE_ORDER.includes(table)) throw new Error(`Table ${table} is not permitted in a content import`);
  if (!Array.isArray(tables[table])) throw new Error(`${table} must contain an array of rows`);
}

const report = [];
await withTransaction(async (client) => {
  for (const table of TABLE_ORDER) {
    const sourceRows = tables[table] ?? [];
    if (!sourceRows.length) continue;
    const schema = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    );
    const allowed = new Set(schema.rows.map((row) => row.column_name));
    const rows = sourceRows.map((source, index) => {
      if (!plainObject(source)) throw new Error(`${table}[${index}] is not an object`);
      const row = Object.fromEntries(Object.entries(source).filter(([column]) => !AUDIT_COLUMNS.has(column)));
      for (const column of Object.keys(row)) {
        if (!allowed.has(column)) throw new Error(`${table}[${index}] contains unknown column ${column}`);
      }
      if (!Object.keys(row).length) throw new Error(`${table}[${index}] has no importable columns`);
      return row;
    });
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    if (rows.some((row) => columns.some((column) => !(column in row)))) {
      throw new Error(`${table} rows must use a consistent set of columns`);
    }
    const conflict = CONFLICT_KEYS[table] ?? ["id"];
    if (conflict.some((column) => !columns.includes(column))) {
      throw new Error(`${table} must include its conflict key (${conflict.join(", ")})`);
    }
    const values = [];
    const tuples = rows.map((row) => `(${columns.map((column) => {
      const raw = row[column];
      const asJson = JSONB_COLUMNS[table]?.has(column);
      values.push(asJson && raw !== null ? JSON.stringify(raw) : raw);
      return asJson ? `$${values.length}::jsonb` : `$${values.length}`;
    }).join(", ")})`);
    // Keep existing primary keys stable when upserting on slug/natural keys.
    const updates = columns.filter((column) => !conflict.includes(column) && column !== "id");
    const action = updates.length
      ? `DO UPDATE SET ${updates.map((column) => `${quoted(column)} = EXCLUDED.${quoted(column)}`).join(", ")}`
      : "DO NOTHING";
    await client.query(
      `INSERT INTO public.${quoted(table)} (${columns.map(quoted).join(", ")}) VALUES ${tuples.join(", ")}
       ON CONFLICT (${conflict.map(quoted).join(", ")}) ${action}`,
      values,
    );
    report.push(`${table}: ${rows.length}`);
  }
});
console.info(`Content import completed (${report.join(", ") || "no rows"}).`);

/**
 * Read-only row counts for the standalone PostgreSQL portal database.
 * Does not INSERT/UPDATE/DELETE. Safe to run against production with ksl_runtime.
 *
 * Usage (from staff-portal):
 *   DATABASE_URL=postgresql://ksl_runtime:...@127.0.0.1:5432/ksl npm run inventory:postgres
 */
import { closePool, query } from "./database.mjs";

const TABLES = [
  "admin_profiles",
  "admin_module_permissions",
  "staff_invites",
  "staff_sessions",
  "news_items",
  "event_items",
  "gallery_photos",
  "gallery_videos",
  "faq_groups",
  "faq_items",
  "service_items",
  "services_settings",
  "career_listings",
  "careers_settings",
  "download_items",
  "downloads_settings",
  "organization_leadership",
  "organization_yards",
  "organization_board_members",
  "organization_milestones",
  "organization_settings",
  "press_assets",
  "press_settings",
  "products",
  "products_settings",
  "projects",
  "projects_settings",
  "csr_projects",
  "csr_settings",
  "site_settings",
  "site_image_overrides",
  "stored_files",
  "website_messages",
  "content_drafts",
  "draft_returns",
  "activity_log",
];

const identity = await query("SELECT current_user AS role, current_database() AS db");
console.log(`role=${identity.rows[0].role} database=${identity.rows[0].db}`);
console.log("---");

const counts = {};
for (const table of TABLES) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(table)) throw new Error(`Invalid table name ${table}`);
  try {
    const result = await query(`SELECT COUNT(*)::int AS count FROM public."${table}"`);
    counts[table] = result.rows[0].count;
    console.log(`${table}\t${result.rows[0].count}`);
  } catch (error) {
    counts[table] = null;
    console.log(`${table}\tERROR\t${error instanceof Error ? error.message : String(error)}`);
  }
}

const emptyContent = Object.entries(counts)
  .filter(([name, count]) => count === 0 && !name.endsWith("_settings") && name !== "activity_log")
  .map(([name]) => name);

console.log("---");
console.log(`empty_or_zero_content_tables: ${emptyContent.join(", ") || "(none)"}`);
console.log("This script only SELECTs. No data was modified.");

await closePool();

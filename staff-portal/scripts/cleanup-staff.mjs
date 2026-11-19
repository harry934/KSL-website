/**
 * Soft-remove non-keeper staff accounts on the local/VPS Postgres portal DB.
 * Preserves the current super-admin and does not delete content attribution FKs
 * (updated_by is ON DELETE SET NULL if a hard delete is ever used later).
 *
 * Usage:
 *   KEEP_ADMIN_USERNAME=yourname node scripts/cleanup-staff.mjs --dry-run
 *   KEEP_ADMIN_USERNAME=yourname node scripts/cleanup-staff.mjs --apply
 *
 * Never commits secrets. Never touches MySQL. Does not reset the database.
 */
import { closePool, query } from "./database.mjs";

const keepUsername = (process.env.KEEP_ADMIN_USERNAME || "").trim().toLowerCase();
const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;

if (!keepUsername) {
  console.error("Set KEEP_ADMIN_USERNAME to the super-admin username that must be preserved.");
  process.exit(1);
}

const keep = await query(
  `SELECT id, username, display_name, is_super_admin, is_active, deleted_at
   FROM public.admin_profiles
   WHERE lower(username) = $1`,
  [keepUsername],
);

if (!keep.rows.length) {
  console.error(`No admin_profiles row found for username "${keepUsername}". Aborting.`);
  await closePool();
  process.exit(1);
}

const keeper = keep.rows[0];
if (!keeper.is_super_admin) {
  console.error(`User "${keepUsername}" is not marked is_super_admin. Aborting.`);
  await closePool();
  process.exit(1);
}

const others = await query(
  `SELECT id, username, display_name, is_super_admin, is_active, deleted_at
   FROM public.admin_profiles
   WHERE id <> $1
   ORDER BY username`,
  [keeper.id],
);

const openInvites = await query(
  `SELECT id, kind, contact_email, phone, used_at, expires_at
   FROM public.staff_invites
   WHERE used_at IS NULL`,
);

console.log(`Keeper: ${keeper.username} (${keeper.id}) super_admin=${keeper.is_super_admin}`);
console.log(`Other profiles: ${others.rows.length}`);
for (const row of others.rows) {
  console.log(` - ${row.username}\tactive=${row.is_active}\tdeleted=${Boolean(row.deleted_at)}\tsuper=${row.is_super_admin}`);
}
console.log(`Open invites: ${openInvites.rows.length}`);

if (dryRun) {
  console.log("Dry run only. Re-run with --apply to soft-delete other profiles and cancel open invites.");
  await closePool();
  process.exit(0);
}

await query("BEGIN");
try {
  if (others.rows.length) {
    await query(
      `UPDATE public.admin_profiles
       SET is_active = false,
           is_super_admin = false,
           deleted_at = COALESCE(deleted_at, now())
       WHERE id <> $1`,
      [keeper.id],
    );
    await query(`DELETE FROM public.staff_sessions WHERE user_id <> $1`, [keeper.id]);
  }
  await query(`DELETE FROM public.staff_invites WHERE used_at IS NULL`);
  // Ensure keeper remains the active super admin.
  await query(
    `UPDATE public.admin_profiles
     SET is_active = true,
         is_super_admin = true,
         deleted_at = NULL
     WHERE id = $1`,
    [keeper.id],
  );
  await query("COMMIT");
} catch (error) {
  await query("ROLLBACK");
  throw error;
}

console.log(`Applied: soft-deleted ${others.rows.length} profile(s), cleared open invites, preserved ${keeper.username}.`);
await closePool();

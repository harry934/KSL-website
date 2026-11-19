/**
 * Disposable-database smoke checks for the standalone PostgreSQL stack.
 * Requires DATABASE_URL pointing at a migrated database as ksl_runtime.
 *
 * Usage (from staff-portal):
 *   DATABASE_URL=postgresql://ksl_runtime:...@127.0.0.1:5432/ksl npm run db:smoke
 */
import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closePool, query } from "./database.mjs";

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const identity = await query("SELECT current_user, current_database() AS db");
assert(identity.rows[0]?.current_user === "ksl_runtime", "expected ksl_runtime role");
assert(identity.rows[0]?.db, "expected a connected database");

const migrations = await query(
  "SELECT version, checksum FROM public.schema_migrations ORDER BY version",
);
assert(migrations.rows.length >= 1, "schema_migrations should contain at least one row");
assert(
  migrations.rows.some((row) => row.version === "001_standalone_schema"),
  "001_standalone_schema must be recorded",
);

const tables = await query(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`);
const names = new Set(tables.rows.map((row) => row.table_name));
for (const required of [
  "admin_profiles",
  "staff_sessions",
  "news_items",
  "gallery_photos",
  "stored_files",
  "schema_migrations",
  "webauthn_challenges",
  "webauthn_credentials",
]) {
  assert(names.has(required), `missing table ${required}`);
}

assert(
  migrations.rows.some((row) => row.version === "002_webauthn_passkeys"),
  "002_webauthn_passkeys must be recorded",
);

const fks = await query(`
  SELECT COUNT(*)::int AS count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
`);
assert(fks.rows[0].count > 0, "expected foreign key constraints");

const indexes = await query(`
  SELECT COUNT(*)::int AS count
  FROM pg_indexes
  WHERE schemaname = 'public'
`);
assert(indexes.rows[0].count > 0, "expected indexes on public tables");

const marker = `smoke-${randomUUID()}`;
const inserted = await query(
  `INSERT INTO public.news_items (title, slug, excerpt, body_html, status)
   VALUES ($1, $2, $3, $4, 'draft')
   RETURNING id, title`,
  [marker, marker, "smoke excerpt", "<p>smoke</p>"],
);
assert(inserted.rows[0]?.title === marker, "news title mismatch after insert");

const selected = await query(
  "SELECT id, title FROM public.news_items WHERE slug = $1",
  [marker],
);
assert(selected.rows[0]?.id === inserted.rows[0].id, "news select did not return inserted row");

const upsertedTitle = `${marker}-upserted`;
const upsert = await query(
  `INSERT INTO public.news_items (id, title, slug, excerpt, body_html, status)
   VALUES ($1, $2, $3, $4, $5, 'published')
   ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status
   RETURNING id, title, status`,
  [inserted.rows[0].id, upsertedTitle, marker, "smoke excerpt", "<p>smoke</p>"],
);
assert(upsert.rows[0]?.title === upsertedTitle, "news upsert with ON CONFLICT (id) failed");
assert(upsert.rows[0]?.status === "published", "news upsert did not publish");

const galleryId = randomUUID();
await query(
  `INSERT INTO public.gallery_photos (id, title, alt_text, category, tags, status, sort_order)
   VALUES ($1, $2, $3, 'all', '{}', 'published', 1)`,
  [galleryId, "Smoke photo", "Smoke alt"],
);
const publishedGallery = await query(
  `SELECT COUNT(*)::int AS count FROM public.gallery_photos
   WHERE status = 'published' AND deleted_at IS NULL AND id = $1`,
  [galleryId],
);
assert(publishedGallery.rows[0].count === 1, "published gallery photo not visible to public filter");

const inviteId = randomUUID();
const inviteToken = `tok_${inviteId.replace(/-/g, "")}`;
const passcodeHash = await bcrypt.hash("123456", 12);
await query(
  `INSERT INTO public.staff_invites
    (id, token, passcode_hash, kind, contact_email, role_title, is_super_admin, expires_at)
   VALUES ($1, $2, $3, 'create', $4, $5, false, $6)`,
  [inviteId, inviteToken, passcodeHash, "smoke-invite@staff.local", "Editor", new Date(Date.now() + 86_400_000).toISOString()],
);
const inviteRow = await query("SELECT id, kind FROM public.staff_invites WHERE id = $1", [inviteId]);
assert(inviteRow.rows[0]?.id === inviteId && inviteRow.rows[0]?.kind === "create", "staff invite insert failed");

await query("DELETE FROM public.staff_invites WHERE id = $1", [inviteId]);
await query("DELETE FROM public.gallery_photos WHERE id = $1", [galleryId]);
await query("DELETE FROM public.news_items WHERE id = $1", [inserted.rows[0].id]);

const passwordHash = await bcrypt.hash("SmokeTest-Password-12!", 12);
const profileId = randomUUID();
const username = `s${profileId.replace(/-/g, "").slice(0, 9)}`;
await query(
  `INSERT INTO public.admin_profiles
    (id, username, password_hash, display_name, contact_email, must_change_password)
   VALUES ($1, $2, $3, $4, $5, true)`,
  [profileId, username, passwordHash, "Smoke Tester", `${username}@staff.local`],
);

const sessionKey = createHash("sha256").update(`smoke-session-${profileId}`).digest("hex");
await query(
  `INSERT INTO public.staff_sessions (user_id, session_key, expires_at)
   VALUES ($1, $2, $3)`,
  [profileId, sessionKey, new Date(Date.now() + 60_000).toISOString()],
);

const sessionRow = await query(
  "SELECT user_id FROM public.staff_sessions WHERE session_key = $1",
  [sessionKey],
);
assert(sessionRow.rows[0]?.user_id === profileId, "staff session not found after insert");

await query("DELETE FROM public.staff_sessions WHERE user_id = $1", [profileId]);
await query("DELETE FROM public.admin_profiles WHERE id = $1", [profileId]);

const storageRoot = process.env.STORAGE_DIR || path.join(os.tmpdir(), `ksl-smoke-storage-${process.pid}`);
const objectPath = `smoke/${profileId}.txt`;
const absolute = path.join(storageRoot, "media-public", objectPath);
await mkdir(path.dirname(absolute), { recursive: true, mode: 0o700 });
const payload = Buffer.from(`smoke-bytes-${profileId}`);
await writeFile(absolute, payload, { mode: 0o600 });
const stored = await query(
  `INSERT INTO public.stored_files (bucket_id, name, size_bytes, content_type)
   VALUES ('media-public', $1, $2, 'text/plain')
   RETURNING id`,
  [objectPath, payload.length],
);
assert(stored.rows[0]?.id, "stored_files insert did not return an id");
const roundTrip = await readFile(absolute);
assert(roundTrip.equals(payload), "storage file bytes mismatch");
await query("DELETE FROM public.stored_files WHERE id = $1", [stored.rows[0].id]);
await rm(path.join(storageRoot, "media-public", "smoke"), { recursive: true, force: true });

await closePool();

if (failures.length) {
  console.error("db-smoke FAILED:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.info(
  `db-smoke OK (${migrations.rows.length} migration(s), ${names.size} tables, CRUD/auth/storage checks passed)`,
);

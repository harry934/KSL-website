/**
 * First-time setup: create the super admin after running the SQL migrations.
 * Usage (from staff-portal/):
 *   node scripts/bootstrap-super-admin.mjs <username> <password> "Full Name" [email]
 * Email is optional; without it the account signs in by username only.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [rawUsername, password, displayName, rawEmail] = process.argv.slice(2);
const username = String(rawUsername ?? "").trim().toLowerCase();
const contactEmail = rawEmail ? rawEmail.trim().toLowerCase() : null;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) || !password || password.length < 10) {
  console.error('Usage: node scripts/bootstrap-super-admin.mjs <username> <password 10+ chars> "Full Name" [email]');
  process.exit(1);
}

const authEmail = contactEmail ?? `${username}@staff.ksl.internal`;
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const found = list.users.find((u) => u.email?.toLowerCase() === authEmail);

let userId;
if (found) {
  userId = found.id;
  console.log("Auth user already exists:", authEmail);
} else {
  const { data, error } = await admin.auth.admin.createUser({ email: authEmail, password, email_confirm: true });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log("Created auth user for", username);
}

const { error: profileErr } = await admin.from("admin_profiles").upsert({
  id: userId,
  username,
  contact_email: contactEmail,
  display_name: displayName || username,
  is_super_admin: true,
  is_active: true,
});

if (profileErr) {
  console.error("Profile error:", profileErr.message);
  console.error("Run supabase/migrations/001 … 007 first.");
  process.exit(1);
}

console.log(`Super admin ready. Sign in with username "${username}"${contactEmail ? ` or ${contactEmail}` : ""}.`);

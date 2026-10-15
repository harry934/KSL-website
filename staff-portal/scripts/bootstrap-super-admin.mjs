/**
 * First-time setup: create super admin + run after SQL migration.
 * Usage (from staff-portal/):
 *   node scripts/bootstrap-super-admin.mjs you@example.com YourPassword "Your Name"
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
const [email, password, displayName] = process.argv.slice(2);

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!email || !password) {
  console.error("Usage: node scripts/bootstrap-super-admin.mjs email password [displayName]");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1 });
let userId;

const { data: byEmail } = await admin.auth.admin.listUsers({ perPage: 200 });
const found = byEmail.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (found) {
  userId = found.id;
  console.log("User already exists:", email);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log("Created auth user:", email);
}

const { error: profileErr } = await admin.from("admin_profiles").upsert({
  id: userId,
  display_name: displayName || email,
  is_super_admin: true,
  is_active: true,
});

if (profileErr) {
  console.error("Profile error:", profileErr.message);
  console.error("Did you run supabase/migrations/001_staff_portal_schema.sql in the SQL Editor?");
  process.exit(1);
}

console.log("Super admin profile ready for", email);

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { withTransaction } from "./database.mjs";

const [rawUsername, rawDisplayName, rawEmail] = process.argv.slice(2);
const username = String(rawUsername ?? "").trim().toLowerCase();
const displayName = String(rawDisplayName ?? username).trim();
const contactEmail = rawEmail ? rawEmail.trim().toLowerCase() : null;

if (process.argv.length < 3 || process.argv.length > 5 ||
    !/^[a-z0-9][a-z0-9._-]{0,9}$/.test(username) ||
    !displayName || displayName.length > 160 ||
    (contactEmail !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) {
  console.error('Usage: node scripts/bootstrap-super-admin.mjs <username> "Full Name" [email]');
  process.exit(1);
}

function readHiddenPassword() {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Run this command from a terminal to enter the initial password securely");
  }
  process.stdout.write("Password (at least 10 characters): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let password = "";
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const byte of chunk) {
        if (byte === 3) {
          cleanup();
          reject(new Error("Password entry cancelled"));
          return;
        }
        if (byte === 13 || byte === 10) {
          cleanup();
          resolve(password);
          return;
        }
        if (byte === 127 || byte === 8) password = password.slice(0, -1);
        else if (byte >= 32 && byte <= 126) password += String.fromCharCode(byte);
      }
    };
    process.stdin.on("data", onData);
  });
}

const password = await readHiddenPassword();
if (password.length < 10 || Buffer.byteLength(password) > 1024) {
  throw new Error("Password must contain 10 to 1024 bytes");
}

const passwordHash = await bcrypt.hash(password, 12);
const id = randomUUID();

await withTransaction(async (client) => {
  await client.query("SELECT pg_advisory_xact_lock($1, $2)", [1296780115, 2]);
  const existingAdmin = await client.query(
    "SELECT 1 FROM public.admin_profiles WHERE is_super_admin LIMIT 1",
  );
  if (existingAdmin.rowCount) {
    throw new Error("A super-admin already exists; bootstrap will not replace or modify it");
  }
  const existingUsername = await client.query(
    "SELECT 1 FROM public.admin_profiles WHERE username = $1",
    [username],
  );
  if (existingUsername.rowCount) throw new Error("That username is already in use");
  await client.query(
    `INSERT INTO public.admin_profiles
      (id, username, password_hash, contact_email, display_name, is_super_admin, is_active, must_change_password)
     VALUES ($1, $2, $3, $4, $5, true, true, true)`,
    [id, username, passwordHash, contactEmail, displayName],
  );
});

console.info(`Super-admin ${username} was created.`);

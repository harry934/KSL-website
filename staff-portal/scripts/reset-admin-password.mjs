import bcrypt from "bcryptjs";
import { withTransaction } from "./database.mjs";

const username = String(process.argv[2] ?? "").trim().toLowerCase();
if (!username || !/^[a-z0-9][a-z0-9._-]{0,9}$/.test(username)) {
  console.error('Usage: node scripts/reset-admin-password.mjs <username>');
  process.exit(1);
}

function readHiddenPassword() {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Run this command from a terminal to enter the password securely");
  }
  process.stdout.write("New password (at least 10 characters): ");
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

const updated = await withTransaction(async (client) => {
  const result = await client.query(
    `UPDATE public.admin_profiles
        SET password_hash = $2,
            must_change_password = false,
            is_active = true,
            updated_at = now()
      WHERE username = $1
      RETURNING username, is_super_admin`,
    [username, passwordHash],
  );
  return result.rows[0] ?? null;
});

if (!updated) {
  console.error(`No admin_profiles row for username "${username}".`);
  process.exit(1);
}

console.info(`Password updated for ${updated.username}${updated.is_super_admin ? " (super-admin)" : ""}.`);

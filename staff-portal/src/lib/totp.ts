import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SEC = 30;
const DIGITS = 6;
const SKEW_STEPS = 1;

function encryptionKey(): Buffer {
  const raw = (process.env.TOTP_ENCRYPTION_SECRET || process.env.CONTACT_TOKEN_SECRET || "").trim();
  if (raw.length < 32) {
    throw new Error("TOTP_ENCRYPTION_SECRET is required for authenticator apps (use openssl rand -base64 48)");
  }
  return createHash("sha256").update(`ksl-totp-v1:${raw}`).digest();
}

export function encryptTotpSecret(secret: Buffer): Buffer {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptTotpSecret(payload: Buffer): Buffer {
  if (payload.length < 29) throw new Error("Invalid encrypted TOTP secret");
  const key = encryptionKey();
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const data = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function generateTotpSecret(): Buffer {
  return randomBytes(20);
}

export function base32Encode(secret: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of secret) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/u, "").replace(/\s+/gu, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function totpAt(secret: Buffer, timeMs = Date.now()): string {
  const counter = Math.floor(timeMs / 1000 / STEP_SEC);
  return hotp(secret, counter);
}

export function verifyTotpCode(secret: Buffer, token: string, timeMs = Date.now()): boolean {
  const cleaned = token.replace(/\s+/gu, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const counter = Math.floor(timeMs / 1000 / STEP_SEC);
  for (let delta = -SKEW_STEPS; delta <= SKEW_STEPS; delta++) {
    if (hotp(secret, counter + delta) === cleaned) return true;
  }
  return false;
}

export function otpauthUri(username: string, secretBase32: string): string {
  const label = encodeURIComponent(`Kenya Shipyards:${username}`);
  const issuer = encodeURIComponent("Kenya Shipyards");
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SEC}`;
}

/** Decode stored base32 if needed; encrypted blobs use raw bytes. */
export function secretFromBase32(secretBase32: string): Buffer {
  return base32Decode(secretBase32);
}

export function recoveryPepper(): string {
  return (process.env.TOTP_ENCRYPTION_SECRET || process.env.CONTACT_TOKEN_SECRET || "ksl-recovery").trim();
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/[\s-]/gu, "").toLowerCase();
  return createHash("sha256").update(`${recoveryPepper()}:recovery:${normalized}`).digest("hex");
}

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString("hex");
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

export function normalizeTotpInput(value: string): string {
  return value.replace(/\s+/gu, "").slice(0, 6);
}

export function normalizeRecoveryInput(value: string): string {
  return value.replace(/\s+/gu, "").toLowerCase().slice(0, 16);
}

export function recoveryMatches(storedHash: string, code: string): boolean {
  const hash = hashRecoveryCode(code);
  try {
    return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const MIN_AGE_MS = 2_000;
const MAX_AGE_MS = 20 * 60 * 1000;

function signingKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing Supabase admin environment variables");
  return createHash("sha256").update(`ksl-contact-v1:${secret}`).digest();
}

function sign(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/** Short-lived proof that the browser loaded the form before posting. */
export function issueContactToken() {
  const payload = Buffer.from(
    JSON.stringify({
      iat: Date.now(),
      exp: Date.now() + MAX_AGE_MS,
      n: randomBytes(16).toString("base64url"),
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyContactToken(token: unknown): "ok" | "invalid" | "too_fast" {
  if (typeof token !== "string" || token.length > 500) return "invalid";
  const dot = token.indexOf(".");
  if (dot <= 0) return "invalid";
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return "invalid";

  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { iat?: unknown; exp?: unknown };
    if (typeof body.iat !== "number" || typeof body.exp !== "number") return "invalid";
    const now = Date.now();
    if (body.exp < now || body.iat > now + 30_000) return "invalid";
    if (now - body.iat < MIN_AGE_MS) return "too_fast";
    return "ok";
  } catch {
    return "invalid";
  }
}

export async function verifyTurnstile(token: unknown, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

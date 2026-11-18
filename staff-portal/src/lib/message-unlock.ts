import { createHmac, timingSafeEqual } from "node:crypto";

export const MESSAGES_UNLOCK_COOKIE = "ksl_messages_unlock";
export const MESSAGES_UNLOCK_MS = 15 * 60 * 1000;

function unlockSecret() {
  const value = process.env.MESSAGE_VIEW_UNLOCK_SECRET?.trim();
  if (!value || Buffer.byteLength(value) < 32) {
    throw new Error("MESSAGE_VIEW_UNLOCK_SECRET must contain at least 32 bytes");
  }
  return value;
}

function sign(userId: string, exp: number) {
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", unlockSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function issueMessagesUnlockToken(userId: string, now = Date.now()) {
  return sign(userId, now + MESSAGES_UNLOCK_MS);
}

export function verifyMessagesUnlockToken(token: string | undefined, userId: string, now = Date.now()) {
  const raw = (token ?? "").trim();
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [uid, expStr, sig] = parts;
  if (uid !== userId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return false;
  const expected = sign(userId, exp).split(".")[2] ?? "";
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type WebsiteMessageRow = {
  id: string;
  first_name: string;
  other_name: string | null;
  surname: string;
  email: string;
  subject: string;
  message: string;
  preferred_contact: string | null;
  submitter_ip: string | null;
  risk_score: number | null;
  risk_flags: string[] | null;
  created_at: string;
  read_at: string | null;
  deleted_at?: string | null;
};

/** Strip PII until the staff member unlocks with their password. */
export function maskWebsiteMessage<T extends WebsiteMessageRow>(row: T, unlocked: boolean): T & { locked: boolean } {
  if (unlocked) return { ...row, locked: false };
  const score = row.risk_score ?? 0;
  const label = score > 0 ? ` · risk ${score}` : "";
  return {
    ...row,
    first_name: "Hidden",
    other_name: null,
    surname: "",
    email: "Hidden",
    subject: `Website message${label}`,
    message: "",
    preferred_contact: null,
    submitter_ip: null,
    locked: true,
  };
}

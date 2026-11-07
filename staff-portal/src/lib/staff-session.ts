export const STAFF_SESSION_COOKIE = "ksl_staff_session";
export const IDLE_MS = 20 * 60 * 1000;
export const TOUCH_MS = 60 * 1000;

export type SessionStop = "missing" | "elsewhere" | "idle";

export function judgeSession(input: {
  cookieKey: string | null | undefined;
  storedKey: string | null | undefined;
  seenAt: string | null | undefined;
  now: number;
  idleMs?: number;
}): SessionStop | null {
  const cookieKey = (input.cookieKey ?? "").trim();
  const storedKey = (input.storedKey ?? "").trim();
  if (!cookieKey || !storedKey) return "missing";
  if (cookieKey !== storedKey) return "elsewhere";
  const seen = input.seenAt ? Date.parse(input.seenAt) : Number.NaN;
  if (!Number.isFinite(seen) || input.now - seen > (input.idleMs ?? IDLE_MS)) return "idle";
  return null;
}

export function sessionNeedsTouch(seenAt: string | null | undefined, now: number, touchMs = TOUCH_MS) {
  const seen = seenAt ? Date.parse(seenAt) : Number.NaN;
  if (!Number.isFinite(seen)) return true;
  return now - seen >= touchMs;
}

/** True when the staff session was used within the idle window. */
export function sessionIsLive(seenAt: string | null | undefined, now = Date.now(), idleMs = IDLE_MS) {
  const seen = seenAt ? Date.parse(seenAt) : Number.NaN;
  return Number.isFinite(seen) && now - seen <= idleMs;
}

export function sessionCookieOptions(maxAge = 60 * 60 * 12) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function browserLabel(userAgent: string | null | undefined) {
  const value = String(userAgent ?? "");
  const browser = /Edg\//.test(value)
    ? "Edge"
    : /Chrome\//.test(value)
      ? "Chrome"
      : /Firefox\//.test(value)
        ? "Firefox"
        : /Safari\//.test(value)
          ? "Safari"
          : "";
  if (!browser) return "";
  const device = /iPhone|iPad|Android/.test(value) ? "phone" : "computer";
  return `${browser} on a ${device}`;
}

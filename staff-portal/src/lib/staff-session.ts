export const STAFF_SESSION_COOKIE = "ksl_staff_session";
export const IDLE_MS = 30 * 60 * 1000;
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

export function sessionCookieOptions(maxAge = 60 * 60 * 12) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function signedOutMessage(reason: string | undefined) {
  if (reason === "idle") return "You were signed out after 30 minutes with no activity.";
  if (reason === "elsewhere") {
    return "You were signed out because this account signed in on another device. Only one session can be open.";
  }
  if (reason === "signedout") return "You have signed out.";
  if (reason === "suspended") return "Your account is suspended. Contact an administrator.";
  if (reason === "missing") return "Please sign in again.";
  return null;
}

export function signingOutCopy(reason: "signedout" | "idle" | "elsewhere" | "suspended") {
  if (reason === "idle") return "Signing out. This session was idle for 30 minutes.";
  if (reason === "elsewhere") return "Signing out. This account signed in on another device.";
  if (reason === "suspended") return "Signing out. This account is suspended.";
  return "Signing out.";
}

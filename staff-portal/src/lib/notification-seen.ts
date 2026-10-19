"use client";

/** Shared with the bell and the sidebar so "Mark all read" clears both. */
export const SEEN_EVENT = "ksl-notifications-seen";

export function seenKey(userId: string) {
  return `ksl-notifications-seen:${userId}`;
}

export function readSeen(userId: string) {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(seenKey(userId))) || 0;
}

export function writeSeen(userId: string, at = Date.now()) {
  window.localStorage.setItem(seenKey(userId), String(at));
  window.dispatchEvent(new Event(SEEN_EVENT));
}

function dismissedKey(userId: string) {
  return `ksl-notifications-read:${userId}`;
}

export function readDismissed(userId: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(dismissedKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Clears these notices from the bell and the sidebar counts. */
export function dismissNotices(userId: string, ids: string[]) {
  const next = [...new Set([...readDismissed(userId), ...ids])].slice(-300);
  window.localStorage.setItem(dismissedKey(userId), JSON.stringify(next));
  writeSeen(userId, Date.now());
}

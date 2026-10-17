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

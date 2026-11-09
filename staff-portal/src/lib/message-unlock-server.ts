import { cookies } from "next/headers";
import { sessionCookieOptions } from "@/lib/staff-session";
import {
  MESSAGES_UNLOCK_COOKIE,
  MESSAGES_UNLOCK_MS,
  issueMessagesUnlockToken,
  verifyMessagesUnlockToken,
} from "@/lib/message-unlock";

export async function messagesViewUnlocked(userId: string) {
  const jar = await cookies();
  return verifyMessagesUnlockToken(jar.get(MESSAGES_UNLOCK_COOKIE)?.value, userId);
}

export async function setMessagesUnlockCookie(userId: string) {
  const jar = await cookies();
  const token = issueMessagesUnlockToken(userId);
  jar.set(MESSAGES_UNLOCK_COOKIE, token, sessionCookieOptions(MESSAGES_UNLOCK_MS / 1000));
  return Date.now() + MESSAGES_UNLOCK_MS;
}

export async function clearMessagesUnlockCookie() {
  const jar = await cookies();
  jar.set(MESSAGES_UNLOCK_COOKIE, "", sessionCookieOptions(0));
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/staff-session";
import { clearSessionCookie, closeMatchingStaffSession, sessionUserIdForToken } from "@/lib/staff-session-server";
import { clearMessagesUnlockCookie } from "@/lib/message-unlock-server";
import { logActivity } from "@/lib/api-auth";

export async function POST() {
  const cookieKey = (await cookies()).get(STAFF_SESSION_COOKIE)?.value ?? "";
  const userId = cookieKey ? await sessionUserIdForToken(cookieKey) : null;
  const ownsSession = userId ? await closeMatchingStaffSession(userId, cookieKey) : false;
  if (userId && ownsSession) {
    await logActivity(userId, "staff", "sign out", "session", userId);
  }
  await clearSessionCookie();
  await clearMessagesUnlockCookie();
  return NextResponse.json({ ok: true });
}

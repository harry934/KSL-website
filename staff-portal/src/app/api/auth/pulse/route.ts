import { NextResponse } from "next/server";
import { liveStaffSession, sessionUserIdForToken } from "@/lib/staff-session-server";
import { STAFF_SESSION_COOKIE } from "@/lib/staff-session";
import { cookies } from "next/headers";

/** Marks the open session as active. The browser calls this only after real use. */
export async function POST() {
  const token = (await cookies()).get(STAFF_SESSION_COOKIE)?.value ?? "";
  const userId = await sessionUserIdForToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const live = await liveStaffSession(userId, true);
  if (!live.ok) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

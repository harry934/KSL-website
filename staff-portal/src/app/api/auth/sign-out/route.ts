import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STAFF_SESSION_COOKIE } from "@/lib/staff-session";
import { clearSessionCookie, closeMatchingStaffSession } from "@/lib/staff-session-server";
import { logActivity } from "@/lib/api-auth";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieKey = (await cookies()).get(STAFF_SESSION_COOKIE)?.value ?? "";
  const ownsSession = user && cookieKey ? await closeMatchingStaffSession(user.id, cookieKey) : false;
  if (user && ownsSession) {
    await logActivity(user.id, "staff", "sign out", "session", user.id);
    await supabase.auth.signOut({ scope: "global" });
  } else if (user) {
    await supabase.auth.signOut({ scope: "local" });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

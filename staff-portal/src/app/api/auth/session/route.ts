import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedOutMessage } from "@/lib/staff-session";
import { liveStaffSession } from "@/lib/staff-session-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again.", code: "missing" }, { status: 401 });
  }
  const live = await liveStaffSession(user.id, false);
  if (!live.ok) {
    const code = live.reason === "suspended" ? "suspended" : live.reason;
    const error =
      live.reason === "suspended"
        ? "Your account is suspended. Contact an administrator."
        : signedOutMessage(live.reason) ?? "Please sign in again.";
    return NextResponse.json({ error, code }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { liveStaffSession } from "@/lib/staff-session-server";

/** Marks the open session as active. The browser calls this only after real use. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const live = await liveStaffSession(user.id, true);
  if (!live.ok) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { liveStaffSession } from "@/lib/staff-session-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const live = await liveStaffSession(user.id, false);
  if (!live.ok) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

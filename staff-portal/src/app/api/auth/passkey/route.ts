import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/auth-server";
import { logActivity } from "@/lib/api-auth";
import { openStaffSession } from "@/lib/staff-session-server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "The passkey was not accepted." }, { status: 401 });
  }

  const { data: profile } = await createAdminClient()
    .from("admin_profiles")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This passkey is not linked to an active staff account." },
      { status: 403 }
    );
  }

  const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
  if (othersError) {
    console.error("Could not close the other session", othersError.message);
  }
  try {
    await openStaffSession(user.id, req.headers.get("user-agent"));
  } catch {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Could not start a session. Try again." }, { status: 500 });
  }
  await logActivity(user.id, "staff", "sign in", "session", user.id, {
    method: "passkey",
    ip: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}

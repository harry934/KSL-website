import { NextRequest, NextResponse } from "next/server";
import { normalizeUsername, validateUsername } from "@/lib/accounts";
import { loadOpenInvite } from "@/lib/staff-invites";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const username = normalizeUsername(body.username);

  if (!token) return NextResponse.json({ error: "Invite required." }, { status: 400 });
  const invite = await loadOpenInvite(token);
  if (!invite) return NextResponse.json({ error: "Link expired" }, { status: 410 });
  if (invite.kind !== "create") {
    return NextResponse.json({ available: false, reason: "Username is not chosen on a password reset." });
  }

  const formatError = validateUsername(username);
  if (formatError) {
    return NextResponse.json({ available: false, reason: formatError });
  }

  const { data: taken } = await createAdminClient()
    .from("admin_profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (taken) {
    return NextResponse.json({
      available: false,
      reason: "This username isn't available. Please try another.",
    });
  }

  return NextResponse.json({ available: true, reason: "This username is available." });
}

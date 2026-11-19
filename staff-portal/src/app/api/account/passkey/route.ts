import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/session";
import { credentialsCurrent, logActivity } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const action = body.action === "removed" ? "removed" : body.action === "registered" ? "registered" : "";
  if (!action) return NextResponse.json({ error: "That action is not available." }, { status: 400 });

  await logActivity(session.userId, "staff", action === "registered" ? "register passkey" : "remove passkey", "passkey", session.userId);
  return NextResponse.json({ ok: true });
}

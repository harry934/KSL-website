import { NextRequest, NextResponse } from "next/server";
import { credentialsCurrent } from "@/lib/api-auth";
import { saveUsernameRequest } from "@/lib/account-requests";
import { getStaffSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;
  if (session.isSuperAdmin) {
    return NextResponse.json({ error: "You can change your username from My details." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await saveUsernameRequest(session.userId, session.username, body.username);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

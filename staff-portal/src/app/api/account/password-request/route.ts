import { NextResponse } from "next/server";
import { savePasswordRequest } from "@/lib/account-requests";
import { credentialsCurrent } from "@/lib/api-auth";
import { getStaffSession } from "@/lib/session";

export async function POST() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;
  if (session.isSuperAdmin) {
    return NextResponse.json({ error: "You can change your password from My account." }, { status: 400 });
  }

  const result = await savePasswordRequest(session.username);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

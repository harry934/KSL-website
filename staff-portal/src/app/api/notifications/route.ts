import { NextResponse } from "next/server";
import { credentialsCurrent } from "@/lib/api-auth";
import { getStaffSession } from "@/lib/session";
import { loadNotifications } from "@/lib/notifications";

/** Bell items are account requests and website messages. */
export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;

  const marks = await loadNotifications(session);
  return NextResponse.json(
    { items: marks.slice(0, 20), marks },
    { headers: { "Cache-Control": "no-store" } }
  );
}

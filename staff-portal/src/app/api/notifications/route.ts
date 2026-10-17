import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/session";
import { loadNotifications } from "@/lib/notifications";

/** Bell items, plus the same rows the sidebar uses to count badges. Administrators only get the full activity log from /activity. */
export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const marks = await loadNotifications(session);
  return NextResponse.json(
    { items: marks.slice(0, 20), marks },
    { headers: { "Cache-Control": "no-store" } }
  );
}

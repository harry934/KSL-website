import { NextResponse } from "next/server";
import { credentialsCurrent } from "@/lib/api-auth";
import { getStaffSession } from "@/lib/session";
import { loadNotifications } from "@/lib/notifications";
import { messagesViewUnlocked } from "@/lib/message-unlock-server";
import { listBinItems } from "@/lib/recycle";

/** Bell items are account requests and website messages. */
export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;

  const [marks, bin] = await Promise.all([
    loadNotifications(session, await messagesViewUnlocked(session.userId)),
    listBinItems(session),
  ]);
  return NextResponse.json(
    { items: marks.slice(0, 20), marks, recycleCount: bin.error ? 0 : bin.items.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}

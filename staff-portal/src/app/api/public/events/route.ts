import { createDatabaseClient } from "@/lib/db-client";
import { splitEventsByDate, type EventRow } from "@/lib/events";
import { nairobiToday } from "@/lib/dates";
import { signPayload } from "@/lib/stored-file";
import { NextResponse } from "next/server";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export async function GET() {
  const admin = createDatabaseClient();
  const today = nairobiToday();
  let { data, error } = await admin.from("event_items").select("*").eq("status", "published").is("deleted_at", null);
  if (error) {
    const again = await admin.from("event_items").select("*").eq("status", "published");
    data = again.data;
    error = again.error;
  }

  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const live = ((data ?? []) as EventRow[]).filter(
    (row) => !row.deleted_at && (!row.go_live_on || String(row.go_live_on).slice(0, 10) <= today)
  );
  const split = splitEventsByDate(live, today);
  const payload = { upcoming: split.upcoming, past: [] };

  return NextResponse.json(await signPayload(payload), {
    headers: { "Cache-Control": PUBLIC_CMS_CACHE },
  });
}

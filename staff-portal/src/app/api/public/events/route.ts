import { createDatabaseClient } from "@/lib/db-client";
import { isEventLive, splitEventsByDate, type EventRow } from "@/lib/events";
import { nairobiToday } from "@/lib/dates";
import { openStoredUrl, signPayload } from "@/lib/stored-file";
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

  const live = ((data ?? []) as EventRow[]).filter((row) => isEventLive(row, today));
  const split = splitEventsByDate(live, today);

  for (const list of [split.upcoming, split.past]) {
    for (const item of list) {
      if (item.image) {
        item.image = (await openStoredUrl(item.image)) || item.image;
      }
    }
  }

  return NextResponse.json(await signPayload(split), {
    headers: { "Cache-Control": PUBLIC_CMS_CACHE },
  });
}

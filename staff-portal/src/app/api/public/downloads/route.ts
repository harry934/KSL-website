import { createDatabaseClient } from "@/lib/db-client";
import { downloadSource, toPublicDownloadsPayload, type DownloadItemRow } from "@/lib/downloads";
import { openStoredUrl } from "@/lib/stored-file";
import { nairobiToday } from "@/lib/dates";
import { NextResponse } from "next/server";
import { PUBLIC_CMS_CACHE } from "@/lib/public-cache";

export async function GET() {
  const admin = createDatabaseClient();
  const settingsRes = await admin.from("downloads_settings").select("base_url").eq("id", "default").maybeSingle();
  let itemsRes = await admin.from("download_items").select("*").eq("status", "published").is("deleted_at", null).order("sort_order", { ascending: true });
  if (itemsRes.error) {
    itemsRes = await admin.from("download_items").select("*").eq("status", "published").order("sort_order", { ascending: true });
  }

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const today = nairobiToday();
  const rows = ((itemsRes.data ?? []) as DownloadItemRow[]).filter((row) => {
    if (row.deleted_at) return false;
    const expires = String(row.expires_on ?? "").slice(0, 10);
    return !expires || expires >= today;
  });
  const payload = toPublicDownloadsPayload(settingsRes.data?.base_url ?? null, rows);
  await Promise.all(payload.items.map(async (item) => {
    const row = rows.find((candidate) => candidate.id === item.id);
    if (row && downloadSource(row) === "storage") {
      item.href = await openStoredUrl(row.external_href?.trim() ?? "") || undefined;
    }
  }));

  return NextResponse.json(payload, {
    headers: { "Cache-Control": PUBLIC_CMS_CACHE },
  });
}

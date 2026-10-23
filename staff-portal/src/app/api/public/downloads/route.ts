import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicDownloadsPayload, type DownloadItemRow } from "@/lib/downloads";
import { signPayload } from "@/lib/stored-file";
import { nairobiToday } from "@/lib/dates";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
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
  const payload = await signPayload(admin, toPublicDownloadsPayload(settingsRes.data?.base_url ?? null, rows));

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

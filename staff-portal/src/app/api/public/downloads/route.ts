import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicDownloadsPayload, type DownloadItemRow } from "@/lib/downloads";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("downloads_settings").select("base_url").eq("id", "default").maybeSingle(),
    admin.from("download_items").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });

  const payload = toPublicDownloadsPayload(
    settingsRes.data?.base_url ?? null,
    (itemsRes.data ?? []) as DownloadItemRow[]
  );

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

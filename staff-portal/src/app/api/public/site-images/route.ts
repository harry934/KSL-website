import { createAdminClient } from "@/lib/supabase/admin";
import { safeImageUrl } from "@/lib/site-images";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await createAdminClient()
    .from("site_image_overrides")
    .select("slot_id, public_url")
    .eq("source", "storage");
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const images: Record<string, string> = {};
  for (const row of data ?? []) {
    const url = safeImageUrl(row.public_url);
    if (row.slot_id && url) images[row.slot_id] = url;
  }

  return NextResponse.json(
    { images },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}

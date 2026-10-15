import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicPhoto } from "@/lib/gallery";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("gallery_photos")
    .select("*")
    .eq("status", "published")
    .order("sort_order");

  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  return NextResponse.json(
    { photos: (data ?? []).map(toPublicPhoto) },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
  );
}

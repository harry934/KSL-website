import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicCsrPayload, type CsrProjectRow, type CsrSettings } from "@/lib/csr";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("csr_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("csr_projects").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);
  if (settingsRes.error || itemsRes.error) {
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }

  const payload = toPublicCsrPayload(settingsRes.data as CsrSettings | null, (itemsRes.data ?? []) as CsrProjectRow[]);
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

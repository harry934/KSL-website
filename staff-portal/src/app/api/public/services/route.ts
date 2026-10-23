import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicServicesPayload, type ServiceRow, type ServicesSettings } from "@/lib/services";
import { signPayload } from "@/lib/stored-file";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("services_settings").select("intro, download_catalog").eq("id", "default").maybeSingle(),
    admin.from("service_items").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = await signPayload(
    admin,
    toPublicServicesPayload(settingsRes.data as ServicesSettings | null, kept((itemsRes.data ?? []) as Array<ServiceRow & { deleted_at?: string | null }>))
  );

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicPress, type PressAssetRow, type PressSettings } from "@/lib/press";
import { signPayload } from "@/lib/stored-file";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [settingsRes, assetsRes] = await Promise.all([
    admin.from("press_settings").select("boilerplate, contact_email, contact_phone").eq("id", "default").maybeSingle(),
    admin.from("press_assets").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (assetsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = await signPayload(
    admin,
    toPublicPress(settingsRes.data as PressSettings | null, (assetsRes.data ?? []) as PressAssetRow[])
  );

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

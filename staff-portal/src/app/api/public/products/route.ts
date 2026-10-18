import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicProductsPayload, type ProductRow, type ProductsSettings } from "@/lib/products";
import { signPayload } from "@/lib/stored-file";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("products_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("products").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);
  if (settingsRes.error || itemsRes.error) {
    return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  }

  const payload = await signPayload(
    admin,
    toPublicProductsPayload(settingsRes.data as ProductsSettings | null, (itemsRes.data ?? []) as ProductRow[])
  );
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

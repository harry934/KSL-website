import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicOrganization, type LeadershipRow, type YardRow } from "@/lib/organization";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [settingsRes, leadershipRes, yardsRes] = await Promise.all([
    admin.from("organization_settings").select("chart_download_id").eq("id", "default").maybeSingle(),
    admin.from("organization_leadership").select("*").order("sort_order", { ascending: true }),
    admin.from("organization_yards").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (leadershipRes.error) return NextResponse.json({ error: leadershipRes.error.message }, { status: 500 });
  if (yardsRes.error) return NextResponse.json({ error: yardsRes.error.message }, { status: 500 });

  const payload = toPublicOrganization(
    settingsRes.data?.chart_download_id ?? null,
    (leadershipRes.data ?? []) as LeadershipRow[],
    (yardsRes.data ?? []) as YardRow[]
  );

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

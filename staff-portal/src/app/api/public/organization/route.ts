import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicOrganization, type BoardMemberRow, type LeadershipRow } from "@/lib/organization";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [settingsRes, leadershipRes, boardRes] = await Promise.all([
    admin.from("organization_settings").select("chart_download_id").eq("id", "default").maybeSingle(),
    admin.from("organization_leadership").select("*").order("sort_order", { ascending: true }),
    admin.from("organization_board_members").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (leadershipRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (boardRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = toPublicOrganization(
    settingsRes.data?.chart_download_id ?? null,
    (leadershipRes.data ?? []) as LeadershipRow[],
    (boardRes.data ?? []) as BoardMemberRow[]
  );

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

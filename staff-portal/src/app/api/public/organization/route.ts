import { createAdminClient } from "@/lib/supabase/admin";
import { toPublicOrganization, type BoardMemberRow, type LeadershipRow } from "@/lib/organization";
import { kept } from "@/lib/recycle";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const [settingsRes, leadershipRes, boardRes] = await Promise.all([
    admin.from("organization_settings").select("chart_download_id, intro_kicker, intro_title, intro_body, chart, board_sections").eq("id", "default").maybeSingle(),
    admin.from("organization_leadership").select("*").eq("status", "published").order("sort_order", { ascending: true }),
    admin.from("organization_board_members").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (leadershipRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (boardRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = toPublicOrganization(
    settingsRes.data,
    kept((leadershipRes.data ?? []) as Array<LeadershipRow & { deleted_at?: string | null }>),
    kept((boardRes.data ?? []) as Array<BoardMemberRow & { deleted_at?: string | null }>)
  );

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}

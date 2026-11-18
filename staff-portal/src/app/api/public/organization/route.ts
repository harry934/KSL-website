import { createDatabaseClient } from "@/lib/db-client";
import { toPublicOrganization, type BoardMemberRow, type LeadershipRow, type MilestoneRow } from "@/lib/organization";
import { kept } from "@/lib/recycle";
import { signPayload } from "@/lib/stored-file";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createDatabaseClient();
  const [settingsRes, leadershipRes, boardRes, milestoneRes] = await Promise.all([
    admin.from("organization_settings").select("chart_download_id, intro_kicker, intro_title, intro_body, chart, board_sections, board_groups, milestones_title, milestones_lead").eq("id", "default").maybeSingle(),
    admin.from("organization_leadership").select("*").eq("status", "published").order("sort_order", { ascending: true }),
    admin.from("organization_board_members").select("*").eq("status", "published").order("sort_order", { ascending: true }),
    admin.from("organization_milestones").select("*").eq("status", "published").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (leadershipRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (boardRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  if (milestoneRes.error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });

  const payload = toPublicOrganization(
    settingsRes.data,
    kept((leadershipRes.data ?? []) as Array<LeadershipRow & { deleted_at?: string | null }>),
    kept((boardRes.data ?? []) as Array<BoardMemberRow & { deleted_at?: string | null }>),
    kept((milestoneRes.data ?? []) as Array<MilestoneRow & { deleted_at?: string | null }>)
  );

  return NextResponse.json(await signPayload(payload), {
    headers: { "Cache-Control": "no-store" },
  });
}

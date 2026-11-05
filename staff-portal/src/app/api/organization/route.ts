import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { cleanIntro, cleanOrgChart } from "@/lib/organization";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("organization", "view");
  if (error) return error;

  const admin = createAdminClient();
  const [settingsRes, leadershipRes, boardRes] = await Promise.all([
    admin.from("organization_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("organization_leadership").select("*").order("sort_order", { ascending: true }),
    admin.from("organization_board_members").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (leadershipRes.error) return NextResponse.json({ error: leadershipRes.error.message }, { status: 500 });
  if (boardRes.error) return NextResponse.json({ error: boardRes.error.message }, { status: 500 });

  const leadership = splitRemoved(leadershipRes.data ?? []);
  const board = splitRemoved(boardRes.data ?? []);
  return NextResponse.json({
    settings: settingsRes.data,
    leadership: leadership.items,
    board: board.items,
    removed: [
      ...leadership.removed.map((row) => ({ id: row.id, title: row.role || "Leadership role", kind: "leadership" })),
      ...board.removed.map((row) => ({ id: row.id, title: row.full_name || "Board member", kind: "board" })),
    ],
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("organization", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createAdminClient();
  if (body.action === "restore") {
    const table = body.scope === "board" ? "organization_board_members" : "organization_leadership";
    const { error: restoreErr } = await restoreRow(admin, table, String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "organization", "restore", table, String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const denied = publishGuard(session, "organization", body.status ?? "draft");
  if (denied) return denied;

  if (body.scope === "settings") {
    const intro = cleanIntro(body);
    const chart = cleanOrgChart(body.chart);
    const { error: upErr } = await admin.from("organization_settings").upsert({
      id: "default",
      chart_download_id: body.chart_download_id ?? null,
      intro_kicker: intro.kicker,
      intro_title: intro.title,
      intro_body: intro.body,
      chart,
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await logActivity(session.userId, "organization", "upsert", "organization_settings", "default");
    return NextResponse.json({ ok: true });
  }

  const id = body.id || crypto.randomUUID();

  if (body.scope === "board") {
    const name = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "").trim();
    if (!name || !role) return NextResponse.json({ error: "A name and a role are required." }, { status: 400 });
    const group = ["defence", "ps", "independent"].includes(body.board_group) ? body.board_group : "independent";
    const section = ["featured", "audit", "risk", "strategy"].includes(body.section) ? body.section : "audit";
    const previous = await rememberFiles(admin, "organization_board_members", body.id, ["photo_url"]);
    const { data, error: upErr } = await admin
      .from("organization_board_members")
      .upsert({
        id,
        full_name: name,
        role,
        board_group: group,
        section,
        summary: body.summary ?? null,
        bio: body.bio ?? null,
        photo_url: body.photo_url || null,
        sort_order: body.sort_order ?? 0,
        status: body.status ?? "draft",
        updated_by: session.userId,
      })
      .select("id")
      .single();
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await releaseUnusedValues(admin, previous);
    await logActivity(session.userId, "organization", "upsert", "organization_board_members", data?.id ?? id);
    return NextResponse.json({ ok: true, id: data?.id });
  }

  const { data, error: upErr } = await admin
    .from("organization_leadership")
    .upsert({
      id,
      role: body.role,
      summary: body.summary ?? null,
      sort_order: body.sort_order ?? 0,
      status: body.status ?? "draft",
      updated_by: session.userId,
    })
    .select("id")
    .single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await logActivity(session.userId, "organization", "upsert", "organization_leadership", data?.id ?? id);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("organization", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  const scope = new URL(req.url).searchParams.get("scope");
  if (!id || !scope) return NextResponse.json({ error: "id and scope required" }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const table = scope === "board" ? "organization_board_members" : "organization_leadership";
  const { error: delErr } = await applyBinDelete(createAdminClient(), table, id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "organization", permanent ? "purge" : "delete", table, id);
  return NextResponse.json({ ok: true });
}

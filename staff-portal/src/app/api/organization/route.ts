import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity, dbError } from "@/lib/api-auth";
import { clearReviewDraft, editorSavePlan, overlayDrafts, overlaySettings, saveBody } from "@/lib/draft-review";
import { cleanBoardGroups, cleanBoardSections, cleanIntro, cleanMilestoneInput, cleanMilestonesHeading, cleanOrgChart } from "@/lib/organization";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("organization", "view");
  if (error) return error;

  const admin = createDatabaseClient();
  const [settingsRes, leadershipRes, boardRes, milestoneRes] = await Promise.all([
    admin.from("organization_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("organization_leadership").select("*").order("sort_order", { ascending: true }),
    admin.from("organization_board_members").select("*").order("sort_order", { ascending: true }),
    admin.from("organization_milestones").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (leadershipRes.error) return NextResponse.json({ error: leadershipRes.error.message }, { status: 500 });
  if (boardRes.error) return NextResponse.json({ error: boardRes.error.message }, { status: 500 });
  if (milestoneRes.error) return NextResponse.json({ error: milestoneRes.error.message }, { status: 500 });

  const leadership = splitRemoved(leadershipRes.data ?? []);
  const board = splitRemoved(boardRes.data ?? []);
  const milestones = splitRemoved(milestoneRes.data ?? []);
  const settings = await overlaySettings(admin, "organization_settings", "default", settingsRes.data);
  return NextResponse.json({
    settings,
    leadership: await overlayDrafts(admin, "organization_leadership", leadership.items),
    board: await overlayDrafts(admin, "organization_board_members", board.items),
    milestones: await overlayDrafts(admin, "organization_milestones", milestones.items),
    removed: [
      ...leadership.removed.map((row) => ({ id: row.id, title: row.role || "Leadership role", kind: "leadership" })),
      ...board.removed.map((row) => ({ id: row.id, title: row.full_name || "Board member", kind: "board" })),
      ...milestones.removed.map((row) => ({ id: row.id, title: row.title || "Milestone", kind: "milestone" })),
    ],
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("organization", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createDatabaseClient();
  if (body.action === "restore") {
    const table = body.scope === "board" ? "organization_board_members" : body.scope === "milestone" ? "organization_milestones" : "organization_leadership";
    const { error: restoreErr } = await restoreRow(admin, table, String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "organization", "restore", table, String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  if (body.scope === "settings") {
    const plan = await editorSavePlan(admin, session, "organization", "organization_settings", {
      settings: true,
      key: "default",
      title: "Organisation page",
      payload: body,
    });
    if (plan.held) return plan.held;
    const intro = cleanIntro(body);
    const chart = cleanOrgChart(body.chart);
    const heading = cleanMilestonesHeading(body);
    const sections = Array.isArray(body.board_sections) ? cleanBoardSections(body.board_sections) : null;
    const groups = Array.isArray(body.board_groups) ? cleanBoardGroups(body.board_groups) : null;
    const { error: upErr } = await admin.from("organization_settings").upsert({
      id: "default",
      chart_download_id: body.chart_download_id ?? null,
      intro_kicker: intro.kicker,
      intro_title: intro.title,
      intro_body: intro.body,
      chart,
      milestones_title: heading.title,
      milestones_lead: heading.lead,
      ...(sections ? { board_sections: sections } : {}),
      ...(groups ? { board_groups: groups } : {}),
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    if (sections) {
      const allowed = sections.map((section) => section.id);
      const { data: members } = await admin.from("organization_board_members").select("id, section");
      const orphans = (members ?? []).filter((row) => !allowed.includes(String(row.section ?? "")));
      if (orphans.length) {
        await admin.from("organization_board_members").update({ section: allowed[0] }).in("id", orphans.map((row) => row.id));
      }
    }
    if (groups) {
      const allowed = groups.map((group) => group.id);
      const { data: members } = await admin.from("organization_board_members").select("id, board_group");
      const orphans = (members ?? []).filter((row) => !allowed.includes(String(row.board_group ?? "")));
      if (orphans.length) {
        await admin.from("organization_board_members").update({ board_group: allowed[0] }).in("id", orphans.map((row) => row.id));
      }
    }
    await logActivity(session.userId, "organization", "upsert", "organization_settings", "default");
    await clearReviewDraft(admin, "organization_settings", null, "default");
    return NextResponse.json(saveBody(session, "organization"));
  }

  const id = body.id || crypto.randomUUID();
  const table = body.scope === "milestone" ? "organization_milestones" : body.scope === "board" ? "organization_board_members" : "organization_leadership";
  const plan = await editorSavePlan(admin, session, "organization", table, {
    id: body.id,
    requestedStatus: body.status ?? "draft",
    title: String(body.title || body.full_name || body.role || "Organisation"),
    payload: body,
  });
  if (plan.held) return plan.held;
  const status = plan.status;

  if (body.scope === "milestone") {
    const row = cleanMilestoneInput(body);
    const previous = await rememberFiles(admin, "organization_milestones", body.id, ["image_url"]);
    const { data, error: upErr } = await admin
      .from("organization_milestones")
      .upsert({
        id,
        ...row,
        sort_order: body.sort_order ?? 0,
        status,
        updated_by: session.userId,
      })
      .select("id")
      .single();
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await releaseUnusedValues(admin, previous);
    await clearReviewDraft(admin, "organization_milestones", data?.id);
    await logActivity(session.userId, "organization", "upsert", "organization_milestones", data?.id ?? id);
    return NextResponse.json(saveBody(session, "organization", { id: data?.id }));
  }

  if (body.scope === "board") {
    const name = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "").trim();
    if (!name || !role) return NextResponse.json({ error: "A name and a role are required." }, { status: 400 });
    const { data: settingsRow } = await admin.from("organization_settings").select("board_sections, board_groups").eq("id", "default").maybeSingle();
    const sections = cleanBoardSections(settingsRow?.board_sections);
    const groups = cleanBoardGroups(settingsRow?.board_groups);
    const requested = String(body.board_group ?? "");
    const group = groups.some((item) => item.id === requested)
      ? requested
      : /^[a-z0-9_-]{1,40}$/.test(requested)
        ? requested
        : groups[0].id;
    const section = sections.some((item) => item.id === body.section) ? String(body.section) : sections[0].id;
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
        status,
        updated_by: session.userId,
      })
      .select("id")
      .single();
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await releaseUnusedValues(admin, previous);
    await clearReviewDraft(admin, "organization_board_members", data?.id);
    await logActivity(session.userId, "organization", "upsert", "organization_board_members", data?.id ?? id);
    return NextResponse.json(saveBody(session, "organization", { id: data?.id }));
  }

  const { data, error: upErr } = await admin
    .from("organization_leadership")
    .upsert({
      id,
      role: body.role,
      summary: body.summary ?? null,
      sort_order: body.sort_order ?? 0,
      status,
      updated_by: session.userId,
    })
    .select("id")
    .single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await clearReviewDraft(admin, "organization_leadership", data?.id);
  await logActivity(session.userId, "organization", "upsert", "organization_leadership", data?.id ?? id);
  return NextResponse.json(saveBody(session, "organization", { id: data?.id }));
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("organization", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  const scope = new URL(req.url).searchParams.get("scope");
  if (!id || !scope) return NextResponse.json({ error: "id and scope required" }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const table = scope === "board" ? "organization_board_members" : scope === "milestone" ? "organization_milestones" : "organization_leadership";
  const { error: delErr } = await applyBinDelete(createDatabaseClient(), table, id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await clearReviewDraft(createDatabaseClient(), table, id);
  await logActivity(session.userId, "organization",  "purge", table, id);
  return NextResponse.json({ ok: true });
}

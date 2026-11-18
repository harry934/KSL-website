import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity, dbError } from "@/lib/api-auth";
import { clearReviewDraft, editorSavePlan, overlayDrafts, overlaySettings, saveBody } from "@/lib/draft-review";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { safeLink } from "@/lib/safe-link";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("careers", "view");
  if (error) return error;

  const admin = createDatabaseClient();
  const [settingsRes, listingsRes] = await Promise.all([
    admin.from("careers_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("career_listings").select("*").order("sort_order", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (listingsRes.error) return NextResponse.json({ error: listingsRes.error.message }, { status: 500 });

  const split = splitRemoved(listingsRes.data ?? []);
  return NextResponse.json({
    settings: await overlaySettings(admin, "careers_settings", "default", settingsRes.data),
    listings: await overlayDrafts(admin, "career_listings", split.items),
    removed: split.removed,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("careers", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createDatabaseClient();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(admin, "career_listings", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "careers", "restore", "career_listing", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  if (body.scope === "settings") {
    const plan = await editorSavePlan(admin, session, "careers", "careers_settings", {
      settings: true,
      key: "default",
      title: "Careers settings",
      payload: body,
    });
    if (plan.held) return plan.held;
    const { error: upErr } = await admin.from("careers_settings").upsert({
      id: "default",
      apply_email: body.apply_email ?? "careers@kenyashipyards.co.ke",
      apply_note: body.apply_note ?? null,
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await clearReviewDraft(admin, "careers_settings", null, "default");
    await logActivity(session.userId, "careers", "upsert", "careers_settings", "default");
    return NextResponse.json(saveBody(session, "careers"));
  }

  const plan = await editorSavePlan(admin, session, "careers", "career_listings", {
    id: body.id,
    requestedStatus: body.status ?? "draft",
    title: String(body.title ?? "Untitled listing"),
    payload: body,
  });
  if (plan.held) return plan.held;

  const applyRaw = body.apply_url == null || body.apply_url === "" ? null : String(body.apply_url);
  const applyUrl = applyRaw == null ? null : safeLink(applyRaw);
  if (applyRaw != null && applyUrl == null) {
    return NextResponse.json({ error: "Use a normal web, email, or phone link." }, { status: 400 });
  }

  const row = {
    id: body.id || crypto.randomUUID(),
    kind: body.kind === "internship" ? "internship" : "vacancy",
    title: body.title,
    location: body.location ?? null,
    summary: body.summary ?? null,
    closing_date: body.closing_date ?? null,
    apply_url: applyUrl,
    sort_order: body.sort_order ?? 0,
    status: plan.status,
    updated_by: session.userId,
  };

  const { data, error: upErr } = await admin.from("career_listings").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await clearReviewDraft(admin, "career_listings", data?.id);
  await logActivity(session.userId, "careers", "upsert", "career_listing", data?.id ?? row.id);
  return NextResponse.json(saveBody(session, "careers", { id: data?.id }));
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("careers", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const { error: delErr } = await applyBinDelete(createDatabaseClient(), "career_listings", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "careers", permanent ? "purge" : "delete", "career_listing", id);
  return NextResponse.json({ ok: true });
}

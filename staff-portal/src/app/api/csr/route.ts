import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff, logActivity, dbError } from "@/lib/api-auth";
import { clearReviewDraft, editorSavePlan, overlayDrafts, overlaySettings, saveBody } from "@/lib/draft-review";
import { slugify } from "@/lib/news";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("csr", "view");
  if (error) return error;

  const admin = createDatabaseClient();
  const [settingsRes, itemsRes] = await Promise.all([
    admin.from("csr_settings").select("*").eq("id", "default").maybeSingle(),
    admin.from("csr_projects").select("*").order("sort_order", { ascending: true }),
  ]);
  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });

  const split = splitRemoved(itemsRes.data ?? []);
  const settings = await overlaySettings(admin, "csr_settings", "default", settingsRes.data);
  return NextResponse.json({ settings, items: await overlayDrafts(admin, "csr_projects", split.items), removed: split.removed });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("csr", "edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const admin = createDatabaseClient();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(admin, "csr_projects", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "csr", "restore", "csr_project", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }

  if (body.scope === "settings") {
    const plan = await editorSavePlan(admin, session, "csr", "csr_settings", {
      settings: true,
      key: "default",
      title: "Community introduction",
      payload: body,
    });
    if (plan.held) return plan.held;
    const { error: upErr } = await admin.from("csr_settings").upsert({
      id: "default",
      kicker: body.kicker ?? null,
      title: body.title ?? null,
      tagline: body.tagline ?? null,
      intro: body.intro ?? null,
      badges: Array.isArray(body.badges) ? body.badges : [],
      hero_images: Array.isArray(body.hero_images) ? body.hero_images : [],
      stats: Array.isArray(body.stats) ? body.stats : [],
      footnote: body.footnote ?? null,
      programmes_title: body.programmes_title ?? null,
      programmes_intro: body.programmes_intro ?? null,
    });
    if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
    await clearReviewDraft(admin, "csr_settings", null, "default");
    await logActivity(session.userId, "csr", "update", "csr_settings", "default");
    return NextResponse.json(saveBody(session, "csr"));
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  const plan = await editorSavePlan(admin, session, "csr", "csr_projects", {
    id: body.id,
    requestedStatus: body.status ?? "draft",
    title,
    payload: body,
  });
  if (plan.held) return plan.held;
  const status = plan.status;

  const row = {
    id: body.id || crypto.randomUUID(),
    slug: String(body.slug || slugify(title)).trim(),
    title,
    summary: body.summary || null,
    image_path: body.image_path || null,
    image_alt: body.image_alt || null,
    location: body.location || null,
    event_date: body.event_date || null,
    sort_order: Number(body.sort_order) || 0,
    status,
    updated_by: session.userId,
  };

  const previous = await rememberFiles(admin, "csr_projects", body.id, ["image_path"]);
  const { data, error: upErr } = await admin.from("csr_projects").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await releaseUnusedValues(admin, previous);
  await clearReviewDraft(admin, "csr_projects", data?.id);
  await logActivity(session.userId, "csr", status === "published" ? "publish" : "save", "csr_project", data?.id);
  return NextResponse.json(saveBody(session, "csr", { id: data?.id }));
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("csr", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const admin = createDatabaseClient();
  const { error: delErr } = await applyBinDelete(admin, "csr_projects", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await clearReviewDraft(admin, "csr_projects", id);
  await logActivity(session.userId, "csr", "purge", "csr_project", id);
  return NextResponse.json({ ok: true });
}

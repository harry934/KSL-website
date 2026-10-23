import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { slugify } from "@/lib/news";
import { projectGroup } from "@/lib/projects";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("projects", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: loadErr } = await admin.from("projects").select("*").order("sort_order", { ascending: true });
  if (loadErr) return NextResponse.json({ error: dbError(loadErr) }, { status: 500 });
  const split = splitRemoved(data ?? []);
  return NextResponse.json({ items: split.items, removed: split.removed });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("projects", "edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(createAdminClient(), "projects", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "projects", "restore", "project", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Give the project a name." }, { status: 400 });

  const status = body.status ?? "draft";
  const denied = publishGuard(session, "projects", status);
  if (denied) return denied;

  const group = projectGroup(body.category);
  const row = {
    id: body.id || crypto.randomUUID(),
    slug: String(body.slug || slugify(title)).trim() || slugify(title),
    title,
    subtitle: String(body.subtitle ?? "").trim() || null,
    category: group.value,
    category_label: group.label,
    image_path: body.image_path || null,
    sort_order: Number(body.sort_order) || 0,
    status,
    updated_by: session.userId,
  };

  const admin = createAdminClient();
  const { data, error: upErr } = await admin.from("projects").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await logActivity(session.userId, "projects", status === "published" ? "publish" : "save", "project", data?.id);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("projects", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const { error: delErr } = await applyBinDelete(createAdminClient(), "projects", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "projects", permanent ? "purge" : "delete", "project", id);
  return NextResponse.json({ ok: true });
}

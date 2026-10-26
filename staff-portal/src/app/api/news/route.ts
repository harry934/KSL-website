import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity, publishGuard, dbError } from "@/lib/api-auth";
import { slugify } from "@/lib/news";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { releaseUnusedValues, rememberFiles } from "@/lib/storage-files";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("news", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("news_items")
    .select("*")
    .order("published_date", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbError(dbErr) }, { status: 500 });
  return NextResponse.json(splitRemoved(data ?? []));
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("news", "edit");
  if (error || !session) return error;

  const body = await req.json();
  if (body.action === "restore") {
    const { error: restoreErr } = await restoreRow(createAdminClient(), "news_items", String(body.id ?? ""));
    if (restoreErr) return NextResponse.json({ error: dbError(restoreErr) }, { status: 500 });
    await logActivity(session.userId, "news", "restore", "news_item", String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  }
  const denied = publishGuard(session, "news", body.status ?? "draft");
  if (denied) return denied;
  const admin = createAdminClient();
  const slug = (body.slug || slugify(body.title || "post")).trim();
  const status = body.status ?? "draft";
  const imageAlt = String(body.image_alt ?? "").trim();
  if (status === "published" && String(body.image_path ?? "").trim() && !imageAlt) {
    return NextResponse.json(
      { error: "Write a short description of the cover photo before the story can go on the website." },
      { status: 400 }
    );
  }
  const row = {
    id: body.id || crypto.randomUUID(),
    slug,
    title: body.title,
    excerpt: body.excerpt ?? null,
    category: body.category ?? "News",
    published_date: body.published_date ?? null,
    image_path: body.image_path ?? null,
    image_alt: imageAlt || null,
    author: body.author ?? "KSL Communications",
    location: body.location ?? null,
    body_html: body.body_html ? sanitizeRichHtml(body.body_html) : null,
    status,
    go_live_on: body.go_live_on ? String(body.go_live_on).slice(0, 10) : null,
    published_at: status === "published" ? new Date().toISOString() : null,
    updated_by: session.userId,
  };

  const previous = await rememberFiles(admin, "news_items", body.id, ["image_path"]);
  const { data, error: upErr } = await admin.from("news_items").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: dbError(upErr) }, { status: 500 });
  await releaseUnusedValues(admin, previous);
  await logActivity(session.userId, "news", "upsert", "news_item", data?.id ?? slug);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("news", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const { error: delErr } = await applyBinDelete(createAdminClient(), "news_items", id, permanent);
  if (delErr?.code === "bin") return NextResponse.json({ error: delErr.message }, { status: 400 });
  if (delErr) return NextResponse.json({ error: dbError(delErr) }, { status: 500 });
  await logActivity(session.userId, "news", permanent ? "purge" : "delete", "news_item", id);
  return NextResponse.json({ ok: true });
}

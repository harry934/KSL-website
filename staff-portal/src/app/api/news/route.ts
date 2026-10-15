import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { slugify } from "@/lib/news";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("news", "view");
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("news_items")
    .select("*")
    .order("published_date", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("news", "edit");
  if (error || !session) return error;

  const body = await req.json();
  const admin = createAdminClient();
  const slug = (body.slug || slugify(body.title || "post")).trim();
  const status = body.status ?? "draft";
  const row = {
    id: body.id || crypto.randomUUID(),
    slug,
    title: body.title,
    excerpt: body.excerpt ?? null,
    category: body.category ?? "News",
    published_date: body.published_date ?? null,
    image_path: body.image_path ?? null,
    author: body.author ?? "KSL Communications",
    location: body.location ?? null,
    body_html: body.body_html ?? null,
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
    updated_by: session.userId,
  };

  const { data, error: upErr } = await admin.from("news_items").upsert(row).select("id").single();
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  await logActivity(session.userId, "news", "upsert", "news_item", data?.id ?? slug);
  return NextResponse.json({ ok: true, id: data?.id });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("news", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error: delErr } = await admin.from("news_items").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  await logActivity(session.userId, "news", "delete", "news_item", id);
  return NextResponse.json({ ok: true });
}

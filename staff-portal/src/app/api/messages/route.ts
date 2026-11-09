import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, requireStaff } from "@/lib/api-auth";
import { applyBinDelete, restoreRow, splitRemoved } from "@/lib/recycle";
import { NextRequest, NextResponse } from "next/server";

const MESSAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const { error } = await requireStaff("messages", "view");
  if (error) return error;

  const { data, error: loadErr } = await createAdminClient()
    .from("website_messages")
    .select("id, first_name, other_name, surname, email, subject, message, preferred_contact, submitter_ip, created_at, read_at, deleted_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (loadErr) return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  const split = splitRemoved(data ?? []);
  return NextResponse.json({ messages: split.items, removed: split.removed }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireStaff("messages", "view");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (body.all) {
    const { error: updateErr } = await admin.from("website_messages").update({ read_at: now }).is("read_at", null).is("deleted_at", null);
    if (updateErr) return NextResponse.json({ error: "Could not update the messages." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error: updateErr } = await admin.from("website_messages").update({ read_at: now }).eq("id", id).is("read_at", null);
  if (updateErr) return NextResponse.json({ error: "Could not update the message." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("messages", "delete");
  if (error || !session) return error;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (body.action !== "restore" || !MESSAGE_ID.test(id)) {
    return NextResponse.json({ error: "That message was not found." }, { status: 400 });
  }
  const { error: restoreErr } = await restoreRow(createAdminClient(), "website_messages", id);
  if (restoreErr) return NextResponse.json({ error: "Could not restore the message." }, { status: 500 });
  await logActivity(session.userId, "messages", "restore", "website_message", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff("messages", "delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!MESSAGE_ID.test(id)) return NextResponse.json({ error: "That message was not found." }, { status: 400 });

  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  const { error: deleteErr } = await applyBinDelete(createAdminClient(), "website_messages", id, permanent);
  if (deleteErr?.code === "bin") return NextResponse.json({ error: deleteErr.message }, { status: 400 });
  if (deleteErr) return NextResponse.json({ error: "Could not delete the message." }, { status: 500 });

  await logActivity(session.userId, "messages", permanent ? "purge" : "delete", "website_message", id);
  return NextResponse.json({ ok: true });
}

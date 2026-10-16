import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireStaff("messages", "view");
  if (error) return error;

  const { data, error: loadErr } = await createAdminClient()
    .from("website_messages")
    .select("id, first_name, other_name, surname, email, subject, message, preferred_contact, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (loadErr) return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireStaff("messages", "view");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (body.all) {
    const { error: updateErr } = await admin.from("website_messages").update({ read_at: now }).is("read_at", null);
    if (updateErr) return NextResponse.json({ error: "Could not update the messages." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error: updateErr } = await admin.from("website_messages").update({ read_at: now }).eq("id", id).is("read_at", null);
  if (updateErr) return NextResponse.json({ error: "Could not update the message." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

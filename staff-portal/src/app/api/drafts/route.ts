import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/api-auth";
import { canAccess } from "@/lib/modules";
import { acceptDraft, listReturnedDrafts, listReviewDrafts, previewDraft, resolveDraftReturns, returnDraft } from "@/lib/draft-review";
import { NextRequest, NextResponse } from "next/server";

function canReview(session: { permissions: Parameters<typeof canAccess>[0]; isSuperAdmin: boolean }) {
  if (session.isSuperAdmin) return true;
  return session.permissions.some((row) => row.can_publish);
}

function draftRef(req: NextRequest, body?: { table?: unknown; entityId?: unknown; entityKey?: unknown }) {
  const params = req.nextUrl.searchParams;
  return {
    table: String(body?.table ?? params.get("table") ?? ""),
    entityId: body?.entityId || params.get("entityId") ? String(body?.entityId ?? params.get("entityId")) : null,
    entityKey: String(body?.entityKey ?? params.get("entityKey") ?? ""),
  };
}

export async function GET(req: NextRequest) {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;
  const admin = createAdminClient();
  if (req.nextUrl.searchParams.get("preview") === "1") {
    const result = await previewDraft(admin, session, draftRef(req));
    if ("changes" in result) return NextResponse.json({ title: result.title, changes: result.changes });
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const review = canReview(session);
  const [items, returned] = await Promise.all([
    review ? listReviewDrafts(admin, session) : Promise.resolve([]),
    listReturnedDrafts(admin, session.userId),
  ]);
  return NextResponse.json({ items, returned });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;
  if (!canReview(session)) return NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error: findErr } = await admin
    .from("content_drafts")
    .select("id, module_key, entity_table, entity_id, entity_key")
    .eq("id", id)
    .maybeSingle();
  if (findErr || !data) return NextResponse.json({ error: "That draft is no longer here." }, { status: 404 });
  if (!canAccess(session.permissions, data.module_key, "publish", session.isSuperAdmin)) {
    return NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 });
  }
  const { error: delErr } = await admin.from("content_drafts").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: "Could not remove the draft." }, { status: 500 });
  await resolveDraftReturns(admin, data.entity_table, data.entity_id, data.entity_key);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;
  if (!canReview(session)) return NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const ref = draftRef(req, body);
  if (body.action === "accept") {
    const result = await acceptDraft(createAdminClient(), session, ref);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }
  const result = await returnDraft(createAdminClient(), session, {
    table: ref.table,
    entityId: ref.entityId,
    entityKey: ref.entityKey,
    note: String(body.note ?? ""),
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

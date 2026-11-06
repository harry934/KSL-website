import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/api-auth";
import { canAccess } from "@/lib/modules";
import { listReturnedDrafts, listReviewDrafts, resolveDraftReturns, returnDraft } from "@/lib/draft-review";
import { NextRequest, NextResponse } from "next/server";

function canReview(session: { permissions: Parameters<typeof canAccess>[0]; isSuperAdmin: boolean }) {
  if (session.isSuperAdmin) return true;
  return session.permissions.some((row) => row.can_publish);
}

export async function GET() {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;
  const admin = createAdminClient();
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
  const result = await returnDraft(createAdminClient(), session, {
    table: String(body.table ?? ""),
    entityId: body.entityId ? String(body.entityId) : null,
    entityKey: String(body.entityKey ?? ""),
    note: String(body.note ?? ""),
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

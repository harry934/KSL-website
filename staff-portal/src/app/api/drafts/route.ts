import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/api-auth";
import { canAccess } from "@/lib/modules";
import { listReviewDrafts } from "@/lib/draft-review";
import { NextRequest, NextResponse } from "next/server";

function canReview(session: { permissions: Parameters<typeof canAccess>[0]; isSuperAdmin: boolean }) {
  if (session.isSuperAdmin) return true;
  return session.permissions.some((row) => row.can_publish);
}

export async function GET() {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;
  if (!canReview(session)) return NextResponse.json({ items: [] });

  const items = await listReviewDrafts(createAdminClient(), session);
  return NextResponse.json({ items });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return error;
  if (!canReview(session)) return NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error: findErr } = await admin.from("content_drafts").select("id, module_key").eq("id", id).maybeSingle();
  if (findErr || !data) return NextResponse.json({ error: "That draft is no longer here." }, { status: 404 });
  if (!canAccess(session.permissions, data.module_key, "publish", session.isSuperAdmin)) {
    return NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 });
  }
  const { error: delErr } = await admin.from("content_drafts").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: "Could not remove the draft." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

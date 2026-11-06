import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { listSpareFiles, removeSpareFile } from "@/lib/storage-files";
import { createAdminClient } from "@/lib/supabase/admin";

async function superAdmin() {
  const { error, session } = await requireStaff(null, "view");
  if (error || !session) return { error, session: null };
  if (!session.isSuperAdmin) {
    return { error: NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export async function GET() {
  const { error } = await superAdmin();
  if (error) return error;
  const files = await listSpareFiles(createAdminClient());
  if (!files) return NextResponse.json({ error: "Could not load unlinked files." }, { status: 500 });
  return NextResponse.json({
    files: files.map((file) => ({
      bucket: file.bucket,
      path: file.path,
      bytes: file.bytes,
      name: file.path.split("/").pop() || file.path,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const { error } = await superAdmin();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const result = await removeSpareFile(createAdminClient(), String(body.bucket ?? ""), String(body.path ?? ""));
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { cancelInvite, createStaffInvite, listOpenInvites } from "@/lib/staff-invites";

async function requireSuperAdmin(action: "view" | "edit" | "delete" = "edit") {
  const { error, session } = await requireStaff("staff", action);
  if (error || !session?.isSuperAdmin) {
    return { error: error ?? NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export async function GET() {
  const { error } = await requireSuperAdmin("view");
  if (error) return error;

  const result = await listOpenInvites();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ invites: result.invites });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin("edit");
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "password_reset" ? "password_reset" : "create";
  const result = await createStaffInvite({
    actorId: session.userId,
    kind,
    email: body.email,
    phone: body.phone,
    superAdmin: body.superAdmin === true,
    roleTitle: body.roleTitle,
    permissions: body.permissions,
    targetProfileId: body.targetProfileId ?? body.id ?? null,
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    id: result.id,
    token: result.token,
    passcode: result.passcode,
    expiresAt: result.expiresAt,
    signupUrl: result.signupUrl,
    email: result.email,
    phone: result.phone,
    kind: result.kind,
  });
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireSuperAdmin("delete");
  if (error || !session) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const result = await cancelInvite(session.userId, id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

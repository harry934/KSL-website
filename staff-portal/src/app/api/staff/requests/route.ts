import { NextRequest, NextResponse } from "next/server";
import {
  approvePasswordRequest,
  approveUsernameRequest,
  rejectAccountRequest,
} from "@/lib/account-requests";
import { requireStaff } from "@/lib/api-auth";
import { createDatabaseClient } from "@/lib/db-client";

async function requireSuperAdmin() {
  const { error, session } = await requireStaff("staff", "edit");
  if (error || !session?.isSuperAdmin) {
    return { error: error ?? NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const admin = createDatabaseClient();
  const { data, error: dbError } = await admin
    .from("staff_account_requests")
    .select("id, user_id, kind, requested_username, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (dbError) return NextResponse.json({ error: "Could not load requests." }, { status: 500 });

  const rows = data ?? [];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles } = ids.length
    ? await admin.from("admin_profiles").select("id, display_name, username, contact_email").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return NextResponse.json({
    requests: rows.map((row) => {
      const profile = byId.get(row.user_id);
      return {
        id: row.id,
        kind: row.kind,
        requestedUsername: row.requested_username,
        createdAt: row.created_at,
        displayName: profile?.display_name ?? "",
        username: profile?.username ?? "",
        email: profile?.contact_email ?? "",
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin();
  if (error || !session) return error;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  if (!id) return NextResponse.json({ error: "That request could not be found." }, { status: 400 });

  if (action === "reject") {
    const result = await rejectAccountRequest(session.userId, id, String(body.reason ?? ""));
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve-username") {
    const result = await approveUsernameRequest(session.userId, id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve-password") {
    const result = await approvePasswordRequest(session.userId, id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      ok: true,
      passcode: result.passcode,
      expiresAt: result.expiresAt,
      signupUrl: result.signupUrl,
      token: result.token,
      username: result.username,
      email: result.email,
      phone: result.phone,
      kind: result.kind,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

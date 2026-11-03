import { NextRequest, NextResponse } from "next/server";
import { clientIp, formatClock, lockedUntil, recordAttempt } from "@/lib/auth-server";
import { verifyInvitePasscode } from "@/lib/staff-invites";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const passcode = String(body.passcode ?? "");
  const ip = clientIp(req);
  const identifier = `invite:${token.slice(0, 24) || "missing"}`;

  const blockedUntil = await lockedUntil(identifier, ip);
  if (blockedUntil) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again after ${formatClock(blockedUntil)}.` },
      { status: 429 }
    );
  }

  const result = await verifyInvitePasscode(token, passcode);
  await recordAttempt(identifier, ip, !result.error);
  if (result.error || !result.invite) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    kind: result.invite.kind,
    expiresAt: result.invite.expires_at,
  });
}

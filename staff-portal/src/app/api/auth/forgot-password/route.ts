import { NextRequest, NextResponse } from "next/server";
import { savePasswordRequest } from "@/lib/account-requests";
import { normalizeUsername } from "@/lib/accounts";
import { clientIp, formatClock, lockedUntil, recordAttempt } from "@/lib/auth-server";

const WAITING = "Your request has been sent. Wait for an email or message from an administrator. They will send you a new password.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const ip = clientIp(req);
  const bucket = `forgot:${ip}`;

  if (!username || username.length > 64) {
    return NextResponse.json({ error: "Enter the username you sign in with." }, { status: 400 });
  }

  const blockedUntil = await lockedUntil(bucket, ip);
  if (blockedUntil) {
    return NextResponse.json(
      { error: `Too many requests. Try again after ${formatClock(blockedUntil)}.` },
      { status: 429 }
    );
  }

  await recordAttempt(bucket, ip, false);
  await savePasswordRequest(username);
  return NextResponse.json({ ok: true, message: WAITING });
}

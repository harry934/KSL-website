import { NextRequest, NextResponse } from "next/server";
import { createDatabaseClient } from "@/lib/db-client";
import { clientIp, formatClock, generateOneTimePassword, hashPassword, lockedUntil, recordAttempt, verifyPassword } from "@/lib/auth-server";
import { normalizeUsername } from "@/lib/accounts";
import { logActivity } from "@/lib/api-auth";
import { openStaffSession } from "@/lib/staff-session-server";

const INVALID = "Invalid username or password.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? "");
  const ip = clientIp(req);

  if (!username || !password || username.length > 64 || password.length > 200) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const blockedUntil = await lockedUntil(username, ip);
  if (blockedUntil) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again after ${formatClock(blockedUntil)}.` },
      { status: 429 }
    );
  }

  const admin = createDatabaseClient();
  const { data: gate, error: gateError } = await admin
    .from("admin_profiles")
    .select("id, is_active, deleted_at, must_change_password, one_time_password_expires_at, password_hash")
    .eq("username", username)
    .maybeSingle();
  if (gateError) {
    console.error("sign-in admin_profiles lookup failed", gateError.code ?? "", gateError.message);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
  if (gate?.deleted_at) {
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }
  const expiresAt = gate?.one_time_password_expires_at ? new Date(gate.one_time_password_expires_at).getTime() : 0;
  if (gate?.is_active && gate.must_change_password && expiresAt && expiresAt <= Date.now()) {
    const discarded = `${generateOneTimePassword()}${generateOneTimePassword()}`.replace(/-/g, "");
    const { error } = await admin.from("admin_profiles").update({ password_hash: await hashPassword(discarded) }).eq("id", gate.id);
    if (error) {
      console.error("sign-in expired OTP discard failed", error.code ?? "", error.message);
      return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
    }
    await recordAttempt(username, ip, false);
    return NextResponse.json(
      { error: "This one-time passcode has expired. Ask an administrator for a new one." },
      { status: 401 }
    );
  }

  if (!gate?.is_active || gate.deleted_at || !(await verifyPassword(gate.password_hash, password))) {
    await recordAttempt(username, ip, false);
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }

  await recordAttempt(username, ip, true);
  try {
    await openStaffSession(gate.id, req.headers.get("user-agent"));
  } catch (sessionError) {
    console.error("Could not start staff session", sessionError);
    return NextResponse.json({ error: "Could not start a session. Try again." }, { status: 500 });
  }
  await logActivity(gate.id, "staff", "sign in", "session", gate.id, { ip });
  return NextResponse.json({ ok: true });
}

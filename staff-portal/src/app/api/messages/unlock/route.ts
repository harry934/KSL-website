import { NextRequest, NextResponse } from "next/server";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { clientIp, formatClock, lockedUntil, recordAttempt, verifyPassword } from "@/lib/auth-server";
import { createDatabaseClient } from "@/lib/db-client";
import { MESSAGES_UNLOCK_MS } from "@/lib/message-unlock";
import { setMessagesUnlockCookie } from "@/lib/message-unlock-server";

export async function POST(req: NextRequest) {
  const { error, session } = await requireStaff("messages", "view");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");
  if (!password || password.length > 200) {
    return NextResponse.json({ error: "Enter your account password." }, { status: 400 });
  }

  const ip = clientIp(req);
  const blockedUntil = await lockedUntil(session.username, ip);
  if (blockedUntil) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again after ${formatClock(blockedUntil)}.` },
      { status: 429 }
    );
  }

  const admin = createDatabaseClient();
  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .select("password_hash")
    .eq("id", session.userId)
    .maybeSingle();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Could not verify your account." }, { status: 503 });
  }
  const ok = await verifyPassword(profile.password_hash, password);
  await recordAttempt(session.username, ip, ok);
  if (!ok) {
    return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
  }

  const unlockedUntil = await setMessagesUnlockCookie(session.userId);
  await logActivity(session.userId, "messages", "unlock_view", "website_message");
  return NextResponse.json({
    ok: true,
    unlockedUntil,
    ttlMs: MESSAGES_UNLOCK_MS,
  });
}

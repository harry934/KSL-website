import { NextRequest, NextResponse } from "next/server";
import { requireStaff, logActivity } from "@/lib/api-auth";
import { clientIp, formatClock, lockedUntil, recordAttempt, verifyPassword } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const admin = createAdminClient();
  const { data: authEmail } = await admin.rpc("auth_email_for_username", { p_username: session.username });
  const email = String(authEmail ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "Could not verify your account." }, { status: 400 });
  }

  const ok = await verifyPassword(email, password);
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

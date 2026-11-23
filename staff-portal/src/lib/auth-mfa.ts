import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/api-auth";
import { startMfaPending } from "@/lib/mfa-pending";
import { openStaffSession } from "@/lib/staff-session-server";
import { beginRecoveryAfterVerification, userHasTotp } from "@/lib/totp-user";

export type PrimaryAuthPurpose = "login" | "recovery";

/** After password, passkey, or recovery TOTP: either open MFA step or finish the sign-in. */
export async function finishPrimaryAuth(
  req: NextRequest,
  userId: string,
  purpose: PrimaryAuthPurpose,
  audit: { ip: string; method: string },
) {
  if (await userHasTotp(userId)) {
    await startMfaPending(userId, purpose);
    return NextResponse.json({
      ok: true,
      mfaRequired: true,
      ...(purpose === "recovery" ? { recovery: true } : {}),
    });
  }
  if (purpose === "recovery") {
    await beginRecoveryAfterVerification(userId);
    await openStaffSession(userId, req.headers.get("user-agent"));
    await logActivity(userId, "staff", "recover access", "session", userId, { ip: audit.ip, method: audit.method });
    return NextResponse.json({ ok: true, passwordResetRequired: true });
  }
  await openStaffSession(userId, req.headers.get("user-agent"));
  await logActivity(userId, "staff", "sign in", "session", userId, { ip: audit.ip, method: audit.method });
  return NextResponse.json({ ok: true });
}
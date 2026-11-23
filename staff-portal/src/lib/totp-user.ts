import { createDatabaseClient } from "@/lib/db-client";
import { query } from "@/lib/db";

export async function userHasTotp(userId: string): Promise<boolean> {
  const { data } = await createDatabaseClient().from("staff_totp").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data?.user_id);
}

export async function profileMustSetupTotp(userId: string): Promise<boolean> {
  const { data } = await createDatabaseClient()
    .from("admin_profiles")
    .select("must_setup_totp")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.must_setup_totp);
}

export async function needsTotpEnrollment(userId: string): Promise<boolean> {
  const [must, has] = await Promise.all([profileMustSetupTotp(userId), userHasTotp(userId)]);
  return must && !has;
}

export async function beginRecoveryAfterVerification(userId: string) {
  await query(
    `UPDATE admin_profiles
     SET must_change_password = true, must_change_username = false, one_time_password_expires_at = NULL
     WHERE id = $1::uuid AND is_active AND deleted_at IS NULL`,
    [userId],
  );
}
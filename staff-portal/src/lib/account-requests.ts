import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUsername, validateUsername } from "@/lib/accounts";
import { authEmailFor, generateOneTimePassword, oneTimePasswordExpiry } from "@/lib/auth-server";
import { logActivity } from "@/lib/api-auth";

export const USERNAME_TAKEN = "That username is already taken.";

export type AccountRequestKind = "username" | "password";

type RequestRow = {
  id: string;
  user_id: string;
  kind: AccountRequestKind;
  requested_username: string | null;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
};

export async function usernameTaken(username: string, exceptUserId: string) {
  const { data } = await createAdminClient()
    .from("admin_profiles")
    .select("id")
    .eq("username", username)
    .neq("id", exceptUserId)
    .maybeSingle();
  return !!data;
}

export async function saveUsernameRequest(userId: string, currentUsername: string, requested: unknown) {
  const name = normalizeUsername(requested);
  const problem = validateUsername(name);
  if (problem) return { error: problem, status: 400 as const };
  if (name === currentUsername) {
    return { error: "Choose a username different from your current one.", status: 400 as const };
  }
  if (await usernameTaken(name, userId)) return { error: USERNAME_TAKEN, status: 409 as const };

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("staff_account_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "username")
    .eq("status", "pending")
    .maybeSingle();

  if (pending?.id) {
    const { error } = await admin
      .from("staff_account_requests")
      .update({ requested_username: name, created_at: new Date().toISOString(), reason: null })
      .eq("id", pending.id);
    if (error) return { error: "Could not send the request. Please try again.", status: 500 as const };
  } else {
    const { error } = await admin.from("staff_account_requests").insert({
      user_id: userId,
      kind: "username",
      requested_username: name,
      status: "pending",
    });
    if (error) return { error: "Could not send the request. Please try again.", status: 500 as const };
  }

  await logActivity(userId, "staff", "request username", "admin_profile", userId, { username: name });
  return { error: null, status: 200 as const };
}

/** Records a password request for a real, active account. Unknown names are ignored. */
export async function savePasswordRequest(username: string): Promise<{ error: string | null }> {
  const name = normalizeUsername(username);
  if (!name) return { error: null };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("admin_profiles")
    .select("id")
    .eq("username", name)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!profile) return { error: null };

  const { data: pending } = await admin
    .from("staff_account_requests")
    .select("id")
    .eq("user_id", profile.id)
    .eq("kind", "password")
    .eq("status", "pending")
    .maybeSingle();
  if (pending?.id) {
    const { error } = await admin
      .from("staff_account_requests")
      .update({ created_at: new Date().toISOString(), reason: null })
      .eq("id", pending.id);
    if (error) return { error: "Could not send the request. Please try again." };
  } else {
    const { error } = await admin.from("staff_account_requests").insert({
      user_id: profile.id,
      kind: "password",
      status: "pending",
    });
    if (error) return { error: "Could not send the request. Please try again." };
  }

  await logActivity(profile.id, "staff", "request password", "admin_profile", profile.id);
  return { error: null };
}

async function pendingRequest(id: string) {
  const { data } = await createAdminClient()
    .from("staff_account_requests")
    .select("id, user_id, kind, requested_username, status, reason")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  return data as RequestRow | null;
}

export async function rejectAccountRequest(actorId: string, id: string, reason: string) {
  const text = reason.trim();
  if (!text) return { error: "Write a reason for the rejection.", status: 400 as const };
  if (text.length > 300) return { error: "Keep the reason under 300 characters.", status: 400 as const };
  const row = await pendingRequest(id);
  if (!row) return { error: "That request is no longer waiting.", status: 404 as const };

  const { error } = await createAdminClient()
    .from("staff_account_requests")
    .update({
      status: "rejected",
      reason: text,
      resolved_at: new Date().toISOString(),
      resolved_by: actorId,
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: "Could not reject the request. Please try again.", status: 500 as const };
  // A rejected password request leaves the password, sign-in, and access exactly as they are.
  await logActivity(actorId, "staff", "reject request", "admin_profile", row.user_id, { kind: row.kind, reason: text });
  return { error: null, status: 200 as const };
}

export async function approveUsernameRequest(actorId: string, id: string) {
  const row = await pendingRequest(id);
  if (!row || row.kind !== "username" || !row.requested_username) {
    return { error: "That request is no longer waiting.", status: 404 as const };
  }

  const admin = createAdminClient();
  if (await usernameTaken(row.requested_username, row.user_id)) {
    await admin
      .from("staff_account_requests")
      .update({
        status: "rejected",
        reason: USERNAME_TAKEN,
        resolved_at: new Date().toISOString(),
        resolved_by: actorId,
      })
      .eq("id", id)
      .eq("status", "pending");
    return { error: USERNAME_TAKEN, status: 409 as const };
  }

  const { data: profile } = await admin
    .from("admin_profiles")
    .select("id, username, contact_email")
    .eq("id", row.user_id)
    .maybeSingle();
  if (!profile) return { error: "That account could not be found.", status: 404 as const };

  const { error: authErr } = await admin.auth.admin.updateUserById(profile.id, {
    email: authEmailFor(row.requested_username, profile.contact_email),
    email_confirm: true,
  });
  if (authErr) {
    const message = /already/i.test(authErr.message)
      ? "That contact email is already used by another account."
      : "Could not change the username. Please try again.";
    return { error: message, status: 400 as const };
  }

  const { error: profileErr } = await admin
    .from("admin_profiles")
    .update({ username: row.requested_username })
    .eq("id", profile.id);
  if (profileErr) return { error: "Could not change the username. Please try again.", status: 500 as const };

  await admin
    .from("staff_account_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: actorId, reason: null })
    .eq("id", id);
  await logActivity(actorId, "staff", "approve username", "admin_profile", profile.id, {
    from: profile.username,
    username: row.requested_username,
  });
  return { error: null, status: 200 as const };
}

export async function approvePasswordRequest(actorId: string, id: string) {
  const row = await pendingRequest(id);
  if (!row || row.kind !== "password") return { error: "That request is no longer waiting.", status: 404 as const };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("admin_profiles")
    .select("id, username, contact_email, is_active, deleted_at")
    .eq("id", row.user_id)
    .maybeSingle();
  if (!profile || profile.deleted_at || !profile.is_active) {
    return { error: "That account is not active.", status: 400 as const };
  }

  const password = generateOneTimePassword();
  const expiresAt = oneTimePasswordExpiry();
  const { error: authErr } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (authErr) return { error: "Could not reset the password. Please try again.", status: 400 as const };

  await admin
    .from("admin_profiles")
    .update({ must_change_password: true, one_time_password_expires_at: expiresAt })
    .eq("id", profile.id);
  await admin
    .from("staff_account_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: actorId, reason: null })
    .eq("id", id);
  await logActivity(actorId, "staff", "reset password", "admin_profile", profile.id, { username: profile.username });

  return {
    error: null,
    status: 200 as const,
    oneTimePassword: password,
    expiresAt,
    username: profile.username as string,
    email: (profile.contact_email as string | null) ?? "",
  };
}

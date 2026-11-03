import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/api-auth";
import {
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/accounts";
import { authEmailFor, generateNumericPasscode, oneTimePasswordExpiry } from "@/lib/auth-server";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { parseRoleTitle } from "@/lib/staff-role";

export type InviteKind = "create" | "password_reset";

export type InvitePermInput = {
  module_key: ModuleKey;
  can_view?: boolean;
  can_edit?: boolean;
  can_publish?: boolean;
  can_delete?: boolean;
};

export type InviteRow = {
  id: string;
  token: string;
  passcode_hash: string;
  kind: InviteKind;
  contact_email: string | null;
  phone: string | null;
  is_super_admin: boolean;
  role_title: string | null;
  permissions: InvitePermInput[];
  target_profile_id: string | null;
  expires_at: string;
  used_at: string | null;
  created_by: string | null;
};

export function hashPasscode(passcode: string) {
  return createHash("sha256").update(`ksl-invite-passcode:${passcode}`).digest("hex");
}

export function passcodesMatch(plain: string, hash: string) {
  const left = Buffer.from(hashPasscode(plain), "utf8");
  const right = Buffer.from(hash, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function normalizePhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || null;
}

export function validatePhone(phone: string | null): string | null {
  if (!phone) return null;
  if (phone.length < 9 || phone.length > 15) return "Enter a valid mobile number or leave it blank.";
  return null;
}

export function inviteContactError(email: string | null, phone: string | null) {
  if (!email && !phone) return "Add an email address or a mobile number.";
  return validateEmail(email ?? "") ?? validatePhone(phone);
}

export function permissionRows(profileId: string, input: unknown) {
  if (!Array.isArray(input)) return [];
  return (input as InvitePermInput[])
    .filter((p) => p && p.module_key in MODULE_LABELS && p.module_key !== "staff")
    .filter((p) => p.can_view || p.can_edit || p.can_publish || p.can_delete)
    .map((p) => ({
      profile_id: profileId,
      module_key: p.module_key,
      can_view: !!(p.can_view || p.can_edit || p.can_publish || p.can_delete),
      can_edit: !!p.can_edit,
      can_publish: !!p.can_publish,
      can_delete: !!p.can_delete,
    }));
}

export function portalBaseUrl() {
  const fromEnv = (process.env.NEXT_PUBLIC_PORTAL_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = (process.env.VERCEL_URL || "").replace(/\/$/, "");
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "https://ksl-websitemink.vercel.app";
}

export function signupUrlFor(token: string) {
  return `${portalBaseUrl()}/signup?t=${encodeURIComponent(token)}`;
}

function newToken() {
  return randomBytes(24).toString("base64url");
}

async function cancelOpenInvites(filter: { kind: InviteKind; targetProfileId?: string; email?: string | null; phone?: string | null }) {
  const admin = createAdminClient();
  let query = admin
    .from("staff_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("kind", filter.kind)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString());
  if (filter.targetProfileId) query = query.eq("target_profile_id", filter.targetProfileId);
  if (filter.email) query = query.eq("contact_email", filter.email);
  if (filter.phone) query = query.eq("phone", filter.phone);
  await query;
}

export async function createStaffInvite(input: {
  actorId: string;
  kind: InviteKind;
  email?: string | null;
  phone?: string | null;
  superAdmin?: boolean;
  roleTitle?: string | null;
  permissions?: unknown;
  targetProfileId?: string | null;
}) {
  const contactEmail = String(input.email ?? "").trim().toLowerCase() || null;
  const phone = normalizePhone(input.phone);
  const contactProblem = inviteContactError(contactEmail, phone);
  if (contactProblem) return { error: contactProblem, status: 400 as const };

  const admin = createAdminClient();
  let targetProfileId: string | null = null;
  let isSuperAdmin = input.superAdmin === true;
  let roleTitle: string | null = null;
  let permissions: InvitePermInput[] = [];

  if (input.kind === "password_reset") {
    const id = String(input.targetProfileId ?? "");
    if (!id) return { error: "That account could not be found.", status: 404 as const };
    const { data: profile } = await admin
      .from("admin_profiles")
      .select("id, username, contact_email, is_active, deleted_at, is_super_admin, role_title")
      .eq("id", id)
      .maybeSingle();
    if (!profile || profile.deleted_at || !profile.is_active) {
      return { error: "That account is not active.", status: 400 as const };
    }
    targetProfileId = profile.id;
    isSuperAdmin = !!profile.is_super_admin;
    roleTitle = profile.role_title;
    await cancelOpenInvites({ kind: "password_reset", targetProfileId: profile.id });
  } else {
    const role = isSuperAdmin ? { title: null, error: null } : parseRoleTitle(input.roleTitle);
    if (role.error) return { error: role.error, status: 400 as const };
    roleTitle = role.title;
    permissions = isSuperAdmin
      ? []
      : permissionRows("pending", input.permissions).map(({ profile_id: _p, ...row }) => row);
    if (contactEmail) {
      const { data: taken } = await admin
        .from("admin_profiles")
        .select("id")
        .eq("contact_email", contactEmail)
        .is("deleted_at", null)
        .maybeSingle();
      if (taken) return { error: "That contact email is already used by another account.", status: 400 as const };
    }
    if (contactEmail) await cancelOpenInvites({ kind: "create", email: contactEmail });
    if (phone) await cancelOpenInvites({ kind: "create", phone });
  }

  const passcode = generateNumericPasscode();
  const token = newToken();
  const expiresAt = oneTimePasswordExpiry();
  const { data, error } = await admin
    .from("staff_invites")
    .insert({
      token,
      passcode_hash: hashPasscode(passcode),
      kind: input.kind,
      contact_email: contactEmail,
      phone,
      is_super_admin: isSuperAdmin,
      role_title: roleTitle,
      permissions,
      target_profile_id: targetProfileId,
      expires_at: expiresAt,
      created_by: input.actorId,
    })
    .select("id, expires_at")
    .single();

  if (error || !data) return { error: "Could not create the invite. Please try again.", status: 500 as const };

  await logActivity(input.actorId, "staff", input.kind === "create" ? "invite" : "reset password", "staff_invite", data.id, {
    kind: input.kind,
    email: contactEmail,
    phone,
  });

  return {
    error: null,
    status: 200 as const,
    id: data.id as string,
    token,
    passcode,
    expiresAt,
    signupUrl: signupUrlFor(token),
    email: contactEmail ?? "",
    phone: phone ?? "",
    kind: input.kind,
  };
}

export async function loadOpenInvite(token: string) {
  const value = String(token ?? "").trim();
  if (!value || value.length > 80) return null;
  const { data } = await createAdminClient()
    .from("staff_invites")
    .select(
      "id, token, passcode_hash, kind, contact_email, phone, is_super_admin, role_title, permissions, target_profile_id, expires_at, used_at, created_by"
    )
    .eq("token", value)
    .maybeSingle();
  if (!data || data.used_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return {
    ...data,
    permissions: Array.isArray(data.permissions) ? (data.permissions as InvitePermInput[]) : [],
  } as InviteRow;
}

export async function verifyInvitePasscode(token: string, passcode: string) {
  const digits = String(passcode ?? "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(digits)) return { error: "Enter the 6-digit passcode.", status: 400 as const, invite: null };
  const invite = await loadOpenInvite(token);
  if (!invite || !passcodesMatch(digits, invite.passcode_hash)) {
    return { error: "That passcode is not correct, or the invite has expired.", status: 401 as const, invite: null };
  }
  return { error: null, status: 200 as const, invite };
}

export async function completeInvite(input: {
  token: string;
  passcode: string;
  username?: string;
  password: string;
}) {
  const verified = await verifyInvitePasscode(input.token, input.passcode);
  if (verified.error || !verified.invite) return { error: verified.error!, status: verified.status };

  const passwordProblem = validatePassword(input.password);
  if (passwordProblem) return { error: passwordProblem, status: 400 as const };

  const invite = verified.invite;
  const admin = createAdminClient();

  if (invite.kind === "password_reset") {
    const profileId = invite.target_profile_id!;
    const { data: profile } = await admin
      .from("admin_profiles")
      .select("id, username, is_active, deleted_at")
      .eq("id", profileId)
      .maybeSingle();
    if (!profile || profile.deleted_at || !profile.is_active) {
      return { error: "That account is not active.", status: 400 as const };
    }
    const { error: authErr } = await admin.auth.admin.updateUserById(profileId, { password: input.password });
    if (authErr) return { error: "Could not save the new password. Please try again.", status: 400 as const };

    await admin
      .from("admin_profiles")
      .update({ must_change_password: false, must_change_username: false, one_time_password_expires_at: null })
      .eq("id", profileId);

    const { data: consumed } = await admin
      .from("staff_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (!consumed) return { error: "That invite was already used.", status: 409 as const };

    await logActivity(profileId, "staff", "change password", "admin_profile", profileId);
    return { error: null, status: 200 as const, kind: invite.kind as InviteKind, username: profile.username as string };
  }

  const username = normalizeUsername(input.username);
  const usernameProblem = validateUsername(username);
  if (usernameProblem) return { error: usernameProblem, status: 400 as const };

  const { data: taken } = await admin.from("admin_profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: "That username is already taken.", status: 409 as const };

  if (invite.contact_email) {
    const { data: emailTaken } = await admin
      .from("admin_profiles")
      .select("id")
      .eq("contact_email", invite.contact_email)
      .is("deleted_at", null)
      .maybeSingle();
    if (emailTaken) return { error: "That contact email is already used by another account.", status: 400 as const };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmailFor(username, invite.contact_email),
    password: input.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const message = /already/i.test(createError?.message ?? "")
      ? "That contact email is already used by another account."
      : "Could not create the account. Please try again.";
    return { error: message, status: 400 as const };
  }

  const userId = created.user.id;
  const { error: profileError } = await admin.from("admin_profiles").insert({
    id: userId,
    username,
    contact_email: invite.contact_email,
    display_name: username,
    role_title: invite.role_title,
    is_super_admin: invite.is_super_admin,
    is_active: true,
    must_change_password: false,
    must_change_username: false,
    one_time_password_expires_at: null,
    created_by: invite.created_by,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "Could not create the account. Please try again.", status: 500 as const };
  }

  if (!invite.is_super_admin) {
    const rows = permissionRows(userId, invite.permissions);
    if (rows.length) await admin.from("admin_module_permissions").insert(rows);
  }

  const { data: consumed } = await admin
    .from("staff_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (!consumed) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "That invite was already used.", status: 409 as const };
  }

  await logActivity(userId, "staff", "create", "admin_profile", userId, { username, via: "invite" });
  return { error: null, status: 200 as const, kind: invite.kind as InviteKind, username };
}

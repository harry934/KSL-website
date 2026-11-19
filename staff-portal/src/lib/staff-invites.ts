import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { withTransaction } from "@/lib/db";
import { createDatabaseClient } from "@/lib/db-client";
import { logActivity } from "@/lib/api-auth";
import {
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/accounts";
import { generateNumericPasscode, hashPassword, oneTimePasswordExpiry } from "@/lib/auth-server";
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
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_PORTAL_URL is required in production");
  }
  return "http://localhost:3000";
}

/** Short invite link, e.g. https://host/i/aB3xY9k2?code=123456 */
export function signupUrlFor(token: string, passcode?: string) {
  const base = `${portalBaseUrl()}/i/${encodeURIComponent(token)}`;
  const digits = String(passcode ?? "").replace(/\D/g, "");
  if (/^\d{6}$/.test(digits)) return `${base}?code=${encodeURIComponent(digits)}`;
  return base;
}

function newToken() {
  // ~8 URL-safe characters; enough with rate limits and 10-minute expiry.
  return randomBytes(6).toString("base64url");
}

async function cancelOpenInvites(filter: { kind: InviteKind; targetProfileId?: string; email?: string | null; phone?: string | null }) {
  const admin = createDatabaseClient();
  // Remove superseded open rows so Resend/Create does not leave cancelled duplicates in the list.
  let query = admin
    .from("staff_invites")
    .delete()
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

  await purgeExpiredInvites();
  const admin = createDatabaseClient();
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
      : permissionRows("pending", input.permissions).map(({ module_key, can_view, can_edit, can_publish, can_delete }) => ({
          module_key,
          can_view,
          can_edit,
          can_publish,
          can_delete,
        }));
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

  if (error || !data) {
    console.error("staff invite insert failed", error);
    return {
      error: error?.message?.includes("format") || error?.code === "22P02"
        ? "Could not create the invite because of a data format problem. Ask an administrator to redeploy the portal build."
        : "Could not create the invite. Please try again.",
      status: 500 as const,
    };
  }

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
    signupUrl: signupUrlFor(token, passcode),
    email: contactEmail ?? "",
    phone: phone ?? "",
    kind: input.kind,
  };
}

export type InviteListStatus = "waiting" | "expired" | "completed" | "cancelled";

/** Removes unused invites whose passcode window has ended. */
export async function purgeExpiredInvites() {
  const admin = createDatabaseClient();
  await admin
    .from("staff_invites")
    .delete()
    .is("used_at", null)
    .lte("expires_at", new Date().toISOString());
}

export async function listOpenInvites() {
  const admin = createDatabaseClient();
  await purgeExpiredInvites();

  const since = new Date(Date.now() - 60 * 24 * 60 * 60_000).toISOString();
  const { data, error } = await admin
    .from("staff_invites")
    .select(
      "id, kind, contact_email, phone, is_super_admin, role_title, permissions, target_profile_id, expires_at, created_at, used_at, token"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { error: "Could not load invites.", status: 500 as const, invites: [] as const };

  const rows = data ?? [];
  const targetIds = [...new Set(rows.map((row) => row.target_profile_id).filter(Boolean))] as string[];
  const emails = [...new Set(rows.map((row) => row.contact_email).filter(Boolean))] as string[];
  const [{ data: profiles }, { data: emailProfiles }] = await Promise.all([
    targetIds.length
      ? admin.from("admin_profiles").select("id, username, display_name").in("id", targetIds)
      : Promise.resolve({ data: [] as { id: string; username: string; display_name: string }[] }),
    emails.length
      ? admin
          .from("admin_profiles")
          .select("id, username, display_name, contact_email")
          .in("contact_email", emails)
          .is("deleted_at", null)
      : Promise.resolve({
          data: [] as { id: string; username: string; display_name: string; contact_email: string | null }[],
        }),
  ]);
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const byEmail = new Map(
    (emailProfiles ?? [])
      .filter((row) => row.contact_email)
      .map((row) => [String(row.contact_email).toLowerCase(), row] as const)
  );
  const now = Date.now();

  return {
    error: null,
    status: 200 as const,
    invites: rows
      .map((row) => {
        const emailKey = row.contact_email ? String(row.contact_email).toLowerCase() : "";
        const fromEmail = emailKey ? byEmail.get(emailKey) : undefined;
        const target = row.target_profile_id ? byId.get(row.target_profile_id) : null;
        const profile = target ?? fromEmail ?? null;
        const expired = new Date(row.expires_at).getTime() <= now;
        if (!row.used_at && expired) return null;
        let status: InviteListStatus = "waiting";
        if (row.used_at) {
          const completed = row.kind === "create" ? !!fromEmail : true;
          status = completed ? "completed" : "cancelled";
        }
        return {
          id: row.id as string,
          kind: row.kind as InviteKind,
          email: (row.contact_email as string | null) ?? "",
          phone: (row.phone as string | null) ?? "",
          isSuperAdmin: !!row.is_super_admin,
          roleTitle: (row.role_title as string | null) ?? null,
          permissions: Array.isArray(row.permissions) ? (row.permissions as InvitePermInput[]) : [],
          expiresAt: row.expires_at as string,
          createdAt: row.created_at as string,
          signupUrl: signupUrlFor(row.token as string),
          targetProfileId: (row.target_profile_id as string | null) ?? (profile?.id as string | undefined) ?? null,
          targetUsername: (profile?.username as string | undefined) ?? "",
          targetDisplayName: (profile?.display_name as string | undefined) ?? "",
          status,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  };
}

export async function cancelInvite(actorId: string, id: string) {
  const admin = createDatabaseClient();
  const { data, error } = await admin
    .from("staff_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", id)
    .is("used_at", null)
    .select("id, kind, contact_email, phone")
    .maybeSingle();
  if (error) return { error: "Could not cancel the invite. Please try again.", status: 500 as const };
  if (!data) return { error: "That invite is no longer open.", status: 404 as const };
  await logActivity(actorId, "staff", "cancel invite", "staff_invite", id, {
    kind: data.kind,
    email: data.contact_email,
    phone: data.phone,
  });
  return { error: null, status: 200 as const };
}

/** Permanently remove an invite from the list (any status). */
export async function deleteInvite(actorId: string, id: string) {
  const admin = createDatabaseClient();
  const { data, error } = await admin
    .from("staff_invites")
    .delete()
    .eq("id", id)
    .select("id, kind, contact_email, phone")
    .maybeSingle();
  if (error) return { error: "Could not delete the invite. Please try again.", status: 500 as const };
  if (!data) return { error: "That invite was not found.", status: 404 as const };
  await logActivity(actorId, "staff", "delete invite", "staff_invite", id, {
    kind: data.kind,
    email: data.contact_email,
    phone: data.phone,
  });
  return { error: null, status: 200 as const };
}

/** Fresh passcode + link on the same invite row (no duplicate list entry). */
export async function resendStaffInvite(actorId: string, id: string) {
  await purgeExpiredInvites();
  const admin = createDatabaseClient();
  const { data: existing, error: loadError } = await admin
    .from("staff_invites")
    .select(
      "id, kind, contact_email, phone, is_super_admin, role_title, permissions, target_profile_id, used_at, expires_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (loadError) return { error: "Could not load that invite.", status: 500 as const };
  if (!existing) return { error: "That invite was not found.", status: 404 as const };

  if (existing.kind === "create" && existing.contact_email) {
    const { data: taken } = await admin
      .from("admin_profiles")
      .select("id")
      .eq("contact_email", existing.contact_email)
      .is("deleted_at", null)
      .maybeSingle();
    if (taken) {
      return { error: "That contact already finished sign-up. Delete this invite if you no longer need it.", status: 400 as const };
    }
  }

  if (existing.kind === "password_reset") {
    const targetId = existing.target_profile_id as string | null;
    if (!targetId) return { error: "That reset invite is incomplete.", status: 400 as const };
    const { data: profile } = await admin
      .from("admin_profiles")
      .select("id, is_active, deleted_at")
      .eq("id", targetId)
      .maybeSingle();
    if (!profile || profile.deleted_at || !profile.is_active) {
      return { error: "That account is not active.", status: 400 as const };
    }
  }

  const passcode = generateNumericPasscode();
  const token = newToken();
  const expiresAt = oneTimePasswordExpiry();
  const { data, error } = await admin
    .from("staff_invites")
    .update({
      token,
      passcode_hash: hashPasscode(passcode),
      expires_at: expiresAt,
      used_at: null,
      created_by: actorId,
    })
    .eq("id", id)
    .select("id, expires_at")
    .single();

  if (error || !data) return { error: "Could not refresh the invite. Please try again.", status: 500 as const };

  const contactEmail = (existing.contact_email as string | null) ?? "";
  const phone = (existing.phone as string | null) ?? "";
  const kind = existing.kind as InviteKind;

  await logActivity(actorId, "staff", "resend invite", "staff_invite", id, {
    kind,
    email: contactEmail || null,
    phone: phone || null,
  });

  return {
    error: null,
    status: 200 as const,
    id: data.id as string,
    token,
    passcode,
    expiresAt,
    signupUrl: signupUrlFor(token, passcode),
    email: contactEmail,
    phone,
    kind,
  };
}

export async function loadOpenInvite(token: string) {
  const value = String(token ?? "").trim();
  if (!value || value.length < 6 || value.length > 32) return null;
  const { data } = await createDatabaseClient()
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
  if (!invite) {
    return { error: "Link expired", status: 410 as const, invite: null };
  }
  if (!passcodesMatch(digits, invite.passcode_hash)) {
    return { error: "That passcode is not correct.", status: 401 as const, invite: null };
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
  const admin = createDatabaseClient();
  const passwordHash = await hashPassword(input.password);

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
    try {
      await withTransaction(async (client) => {
        const consumed = await client.query(
          "UPDATE staff_invites SET used_at = now() WHERE id = $1 AND used_at IS NULL AND expires_at > now() RETURNING id",
          [invite.id],
        );
        if (!consumed.rowCount) throw Object.assign(new Error("invite already used"), { code: "INVITE_USED" });
        const saved = await client.query(
          "UPDATE admin_profiles SET password_hash = $1, must_change_password = false, must_change_username = false, one_time_password_expires_at = NULL WHERE id = $2 AND is_active AND deleted_at IS NULL RETURNING username",
          [passwordHash, profileId],
        );
        if (!saved.rowCount) throw Object.assign(new Error("inactive account"), { code: "INACTIVE_ACCOUNT" });
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "INVITE_USED") return { error: "That invite was already used.", status: 409 as const };
      console.error("Password-reset invite could not be completed", code ?? "database error");
      return { error: "Could not save the new password. Please try again.", status: 500 as const };
    }

    await logActivity(profileId, "staff", "change password", "admin_profile", profileId);
    return { error: null, status: 200 as const, kind: invite.kind as InviteKind, username: profile.username as string };
  }

  const username = normalizeUsername(input.username);
  const usernameProblem = validateUsername(username);
  if (usernameProblem) return { error: usernameProblem, status: 400 as const };

  const { data: taken } = await admin.from("admin_profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: "This username isn't available. Please try another.", status: 409 as const };

  if (invite.contact_email) {
    const { data: emailTaken } = await admin
      .from("admin_profiles")
      .select("id")
      .eq("contact_email", invite.contact_email)
      .is("deleted_at", null)
      .maybeSingle();
    if (emailTaken) return { error: "That contact email is already used by another account.", status: 400 as const };
  }

  let userId = "";
  try {
    userId = await withTransaction(async (client) => {
      const consumed = await client.query(
        "UPDATE staff_invites SET used_at = now() WHERE id = $1 AND used_at IS NULL AND expires_at > now() RETURNING id",
        [invite.id],
      );
      if (!consumed.rowCount) throw Object.assign(new Error("invite already used"), { code: "INVITE_USED" });
      const created = await client.query<{ id: string }>(
        `INSERT INTO admin_profiles
          (username, contact_email, display_name, role_title, is_super_admin, is_active,
           must_change_password, must_change_username, one_time_password_expires_at, created_by, password_hash)
         VALUES ($1, $2, $3, $4, $5, true, false, false, NULL, $6, $7)
         RETURNING id`,
        [username, invite.contact_email, username, invite.role_title, invite.is_super_admin, invite.created_by, passwordHash],
      );
      const id = created.rows[0]?.id;
      if (!id) throw new Error("account insert returned no id");
      if (!invite.is_super_admin) {
        for (const permission of permissionRows(id, invite.permissions)) {
          await client.query(
            `INSERT INTO admin_module_permissions
              (profile_id, module_key, can_view, can_edit, can_publish, can_delete)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [permission.profile_id, permission.module_key, permission.can_view, permission.can_edit, permission.can_publish, permission.can_delete],
          );
        }
      }
      return id;
    });
  } catch (error) {
    const failure = error as { code?: string; constraint?: string };
    if (failure.code === "INVITE_USED") return { error: "That invite was already used.", status: 409 as const };
    if (failure.code === "23505" && failure.constraint?.includes("username")) {
      return { error: "This username isn't available. Please try another.", status: 409 as const };
    }
    if (failure.code === "23505" && failure.constraint?.includes("contact_email")) {
      return { error: "That contact email is already used by another account.", status: 400 as const };
    }
    console.error("Staff invite could not create an account", failure.code ?? "database error");
    return { error: "Could not create the account. Please try again.", status: 500 as const };
  }

  await logActivity(userId, "staff", "create", "admin_profile", userId, { username, via: "invite" });
  return { error: null, status: 200 as const, kind: invite.kind as InviteKind, username };
}

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check, Copy, KeyRound, Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid, FormSection, Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { SearchBox, matchesSearch } from "@/components/ui/list-tools";
import { UserAvatar } from "@/components/portal/user-avatar";
import { usePortalSession } from "@/components/portal/session-context";
import { MODULE_GROUPS, MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { parseRoleTitle, roleLabel } from "@/lib/staff-role";
import { SIDEBAR_ITEM_LIMIT, permissionNavLinks } from "@/lib/portal-nav";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";
import { sendJson } from "@/lib/upload-client";
import { cn } from "@/lib/cn";
import { PasscodeDisplay } from "@/components/ui/password-input";

const EDITABLE_MODULES = (Object.keys(MODULE_LABELS) as ModuleKey[]).filter((k) => k !== "staff") as ModuleKey[];
type PermField = "can_view" | "can_edit" | "can_publish" | "can_delete";

type PermRow = { module_key: ModuleKey } & Record<PermField, boolean>;
type AccessLevel = "read" | "edit" | "publish" | "full";

type StaffRow = {
  id: string;
  username: string;
  display_name: string;
  contact_email: string | null;
  is_super_admin: boolean;
  role_title: string | null;
  is_active: boolean;
  must_change_password: boolean;
  avatar_url: string | null;
  permissions: PermRow[];
};

type Panel = { kind: "create" } | { kind: "edit"; row: StaffRow } | null;
type AccountRequest = {
  id: string;
  kind: "username" | "password";
  requestedUsername: string | null;
  createdAt: string;
  displayName: string;
  username: string;
  email: string;
};
type Issued = {
  passcode: string;
  signupUrl: string;
  email: string;
  phone: string;
  isNew: boolean;
  expiresAt: string;
  username?: string;
};
type PendingInvite = {
  id: string;
  kind: "create" | "password_reset";
  email: string;
  phone: string;
  isSuperAdmin: boolean;
  roleTitle: string | null;
  permissions?: PermRow[];
  expiresAt: string;
  createdAt: string;
  signupUrl: string;
  targetProfileId?: string | null;
  targetUsername: string;
  targetDisplayName: string;
  status: "waiting" | "expired" | "completed" | "cancelled";
};

function layoutHint(permissions: PermRow[]) {
  const count = permissionNavLinks({ isSuperAdmin: false, permissions }).length;
  if (count > SIDEBAR_ITEM_LIMIT) return "More than six sections, so this person will have a sidebar.";
  if (count === 0) return "No sections yet, so the dashboard stays empty and there is no sidebar.";
  return "Six sections or fewer, so there is no sidebar. The dashboard shows a card for each section.";
}

function emptyPerms(): PermRow[] {
  return EDITABLE_MODULES.map((key) => ({
    module_key: key,
    can_view: false,
    can_edit: false,
    can_publish: false,
    can_delete: false,
  }));
}

function permsFrom(row: StaffRow): PermRow[] {
  return emptyPerms().map((empty) => row.permissions.find((p) => p.module_key === empty.module_key) ?? empty);
}

function flagsFor(level: AccessLevel): Record<PermField, boolean> {
  return {
    can_view: true,
    can_edit: level !== "read",
    can_publish: level === "publish" || level === "full",
    can_delete: level === "full",
  };
}

function applyLevel(row: PermRow, level: "none" | AccessLevel): PermRow {
  if (level === "none") {
    return { ...row, can_view: false, can_edit: false, can_publish: false, can_delete: false };
  }
  return { ...row, ...flagsFor(level) };
}

const LEVEL_CHOICES: { value: "none" | AccessLevel; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "read", label: "Can open" },
  { value: "edit", label: "Can change" },
  { value: "publish", label: "Can publish" },
  { value: "full", label: "Full access" },
];

function levelOf(row: PermRow): "none" | AccessLevel {
  if (row.can_delete) return "full";
  if (row.can_publish) return "publish";
  if (row.can_edit) return "edit";
  if (row.can_view) return "read";
  return "none";
}

function sharedLevel(rows: PermRow[]) {
  if (!rows.length) return "none";
  const first = levelOf(rows[0]);
  return rows.every((row) => levelOf(row) === first) ? first : "";
}

function LevelSelect({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (level: "none" | AccessLevel) => void;
}) {
  return (
    <select
      className="h-9 min-w-[148px] rounded-[8px] border border-[#d5dce4] bg-white px-2 text-[13.5px] font-semibold text-[#0b1f3a]"
      aria-label={label}
      value={value}
      onChange={(event) => {
        const level = event.target.value as "none" | AccessLevel;
        if (level) onChange(level);
      }}
    >
      {value === "" && <option value="">Mixed</option>}
      {LEVEL_CHOICES.map((choice) => (
        <option key={choice.value} value={choice.value}>
          {choice.label}
        </option>
      ))}
    </select>
  );
}

function AccessEditor({
  permissions,
  onChange,
}: {
  permissions: PermRow[];
  onChange: (next: PermRow[]) => void;
}) {
  function applyTo(keys: ModuleKey[], level: "none" | AccessLevel) {
    const chosen = new Set(keys);
    onChange(permissions.map((row) => (chosen.has(row.module_key) ? applyLevel(row, level) : row)));
  }

  const rowsFor = (keys: ModuleKey[]) => permissions.filter((row) => keys.includes(row.module_key));

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e3e8ee]">
      <div className="flex items-center justify-between gap-3 bg-[#f6f8fa] px-3 py-2.5">
        <p className="text-[13.5px] font-semibold text-[#0b1f3a]">Every section</p>
        <LevelSelect
          value={sharedLevel(rowsFor(EDITABLE_MODULES))}
          label="Access for every section"
          onChange={(level) => applyTo(EDITABLE_MODULES, level)}
        />
      </div>
      {MODULE_GROUPS.map((group) => {
        const modules = group.modules.filter((key) => key !== "staff");
        if (!modules.length) return null;
        return (
          <div key={group.label}>
            <div className="flex items-center justify-between gap-3 border-t border-[#e3e8ee] bg-[#f8fafc] px-3 py-2">
              <p className="text-[13px] font-semibold text-[#0b1f3a]">{group.label}</p>
              <LevelSelect
                value={sharedLevel(rowsFor(modules))}
                label={`Access for ${group.label}`}
                onChange={(level) => applyTo(modules, level)}
              />
            </div>
            {modules.map((key) => {
              const row = permissions.find((item) => item.module_key === key);
              if (!row) return null;
              return (
                <div key={key} className="flex items-center justify-between gap-3 border-t border-[#eef1f4] px-3 py-2 pl-6">
                  <p className="text-[13.5px] text-[#0b1f3a]">{MODULE_LABELS[key]}</p>
                  <LevelSelect value={levelOf(row)} label={`Access for ${MODULE_LABELS[key]}`} onChange={(level) => applyTo([key], level)} />
                </div>
              );
            })}
          </div>
        );
      })}
      <p className="border-t border-[#eef1f4] px-3 py-2 text-[12.5px] text-[#6b7785]">
        Pick one level. Can change includes opening. Can publish includes changing. Full access can also remove items.
      </p>
    </div>
  );
}

function RoleFields({
  isAdmin,
  jobTitle,
  onAdmin,
  onTitle,
}: {
  isAdmin: boolean;
  jobTitle: string;
  onAdmin: (next: boolean) => void;
  onTitle: (next: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <label className="flex items-start gap-2 text-[14px] text-[#0b1f3a]">
        <input type="checkbox" className="mt-1" checked={isAdmin} onChange={(event) => onAdmin(event.target.checked)} />
        <span>
          <span className="font-semibold">Administrator</span>
          <span className="mt-0.5 block text-[12.5px] text-[#6b7785]">Every section, including other staff.</span>
        </span>
      </label>
      {!isAdmin && (
        <Field label="Role" hint="Type the role. Then set what they can do in each section.">
          <Input value={jobTitle} onChange={(event) => onTitle(event.target.value)} placeholder="e.g. News officer" maxLength={40} required />
        </Field>
      )}
    </div>
  );
}

function expiryLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-KE", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function inviteSubject(issued: Issued) {
  return issued.isNew
    ? "Kenya Shipyards Limited staff portal invite"
    : "Kenya Shipyards Limited password reset";
}

let logoDataUrlPromise: Promise<string> | null = null;

function logoPublicUrl() {
  if (typeof window === "undefined") return "/ksl-logo.png";
  return `${window.location.origin}/ksl-logo.png`;
}

async function logoDataUrl() {
  if (typeof window === "undefined") return logoPublicUrl();
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = (async () => {
      try {
        const res = await fetch(logoPublicUrl());
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || logoPublicUrl()));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      } catch {
        return logoPublicUrl();
      }
    })();
  }
  return logoDataUrlPromise;
}

function invitePlainText(issued: Issued) {
  const until = expiryLabel(issued.expiresAt);
  return [
    "Kenya Shipyards Limited",
    "",
    issued.isNew ? "Staff portal invite" : "Password reset",
    "",
    `Passcode: ${issued.passcode}`,
    `Link: ${issued.signupUrl}`,
    until ? `Expires ${until} EAT` : "Expires in 10 minutes",
  ].join("\n");
}

async function inviteHtmlEmail(issued: Issued) {
  const until = expiryLabel(issued.expiresAt);
  const logo = await logoDataUrl();
  const headline = issued.isNew ? "Staff portal invitation" : "Password reset";
  const intro = issued.isNew
    ? "You have been invited to the Kenya Shipyards Limited staff portal."
    : "Use this passcode and link to choose a new password.";
  const cta = issued.isNew ? "Complete sign-up" : "Reset password";
  const expiry = until
    ? `Expires <strong style="color:#0b1f3a;">${until} East Africa Time</strong>`
    : "Expires in <strong style=\"color:#0b1f3a;\">10 minutes</strong>";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${inviteSubject(issued)}</title></head>
<body style="margin:0;padding:0;background:#eef2f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#0b1f3a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;background:#ffffff;border:1px solid #d7dee7;">
          <tr><td style="height:4px;background:#0b1f3a;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:28px 36px 18px;text-align:center;">
              <img src="${logo}" alt="Kenya Shipyards Limited" width="88" height="88" style="display:block;margin:0 auto 14px;border:0;width:88px;height:88px;" />
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#c5a028;font-weight:700;">Ministry of Defence</p>
              <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#0b1f3a;">Kenya Shipyards Limited</p>
              <p style="margin:8px 0 0;font-size:15px;color:#5b6775;">${headline}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 28px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3d4c5f;">${intro}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fa;border:1px solid #e5e9ef;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7785;font-weight:700;">One-time passcode</p>
                    <p style="margin:0;font-size:30px;letter-spacing:0.32em;font-weight:700;color:#0b1f3a;font-family:Consolas,'Courier New',monospace;">${issued.passcode}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:22px 0 14px;text-align:center;">
                <a href="${issued.signupUrl}" style="display:inline-block;background:#0b1f3a;color:#ffffff !important;text-decoration:none;font-size:14px;font-weight:700;padding:13px 26px;">${cta}</a>
              </p>
              <p style="margin:0 0 22px;font-size:12.5px;line-height:1.5;word-break:break-all;text-align:center;"><a href="${issued.signupUrl}" style="color:#0b4f8a;">${issued.signupUrl}</a></p>
              <p style="margin:0;font-size:13px;color:#5b6775;">${expiry}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 36px 24px;border-top:1px solid #eef1f4;">
              <p style="margin:0;font-size:12px;color:#6b7785;">© Kenya Shipyards Limited</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function whatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
  return digits;
}

function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function buildInviteEml(to: string, subject: string, html: string, plain: string) {
  const boundary = `ksl_${Date.now().toString(36)}`;
  const encodedSubject = `=?UTF-8?B?${encodeUtf8Base64(subject)}?=`;
  return [
    "MIME-Version: 1.0",
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "X-Unsent: 1",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    plain,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function openInviteEml(filename: string, eml: string) {
  const blob = new Blob([eml], { type: "message/rfc822" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M6 10.5v27A3.5 3.5 0 0 0 9.5 41H14V22.1l10 7.7 10-7.7V41h4.5a3.5 3.5 0 0 0 3.5-3.5v-27L24 24 6 10.5Z" />
      <path fill="#C5221F" d="M6 10.5 24 24l18-13.5V9A3.5 3.5 0 0 0 38.5 5.5h-29A3.5 3.5 0 0 0 6 9v1.5Z" />
      <path fill="#4285F4" d="M14 22.1V41H9.5A3.5 3.5 0 0 1 6 37.5v-27L14 22.1Z" />
      <path fill="#34A853" d="M42 10.5v27a3.5 3.5 0 0 1-3.5 3.5H34V22.1L42 10.5Z" />
      <path fill="#FBBC04" d="M14 22.1 24 29.8l10-7.7V41H14V22.1Z" />
    </svg>
  );
}

function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#0078D4" d="M24 8h16.5A3.5 3.5 0 0 1 44 11.5v25a3.5 3.5 0 0 1-3.5 3.5H24V8Z" />
      <path fill="#50D9FF" d="M24 8h3v32h-3V8Z" />
      <path fill="#0A66C2" d="M4.5 13h22v22h-22A3.5 3.5 0 0 1 1 31.5v-15A3.5 3.5 0 0 1 4.5 13Z" />
      <circle cx="15.5" cy="24" r="7" fill="#fff" />
      <circle cx="15.5" cy="24" r="4.2" fill="#0A66C2" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#25D366"
        d="M24.08 4C13.16 4 4.3 12.74 4.3 23.5c0 3.84 1.04 7.44 2.88 10.54L4 44l10.32-3.08A20.1 20.1 0 0 0 24.08 43h.02C35.02 43 43.9 34.26 43.9 23.5S35.02 4 24.08 4Z"
      />
      <path
        fill="#fff"
        d="M34.4 29.1c-.48-.24-2.84-1.4-3.28-1.56-.44-.16-.76-.24-1.08.24-.32.48-1.24 1.56-1.52 1.88-.28.32-.56.36-1.04.12-.48-.24-2.04-.74-3.88-2.4-1.44-1.26-2.4-2.8-2.68-3.28-.28-.48-.04-.74.2-.98.22-.2.48-.56.72-.84.24-.28.32-.48.48-.8.16-.32.08-.6-.04-.84-.12-.24-1.08-2.6-1.48-3.56-.4-.96-.8-.8-1.08-.8h-.92c-.32 0-.84.12-1.28.6-.44.48-1.68 1.64-1.68 4s1.72 4.64 1.96 4.96c.24.32 3.4 5.2 8.24 7.28 1.16.48 2.04.76 2.76 1 .1.16 2.2.32 3.04.2.92-.12 2.84-1.16 3.24-2.28.4-1.12.4-2.08.28-2.28-.12-.2-.44-.32-.92-.56Z"
      />
    </svg>
  );
}

function ShareIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-14 w-14 items-center justify-center rounded-full transition hover:bg-[#f0f3f7] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b1f3a]/25 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function OneTimePasscodeBox({ issued, onClose }: { issued: Issued; onClose: () => void }) {
  const [copied, setCopied] = useState<"passcode" | "link" | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const plain = invitePlainText(issued);
  const subject = inviteSubject(issued);
  const hasEmail = issued.email.includes("@");

  useEffect(() => {
    let alive = true;
    inviteHtmlEmail(issued).then((html) => {
      if (alive) setPreviewHtml(html);
    });
    return () => {
      alive = false;
    };
  }, [issued]);

  async function copyText(value: string, which: "passcode" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  async function openMailDraft() {
    if (!hasEmail) return;
    const html = previewHtml || (await inviteHtmlEmail(issued));
    openInviteEml(
      `Kenya-Shipyards-${issued.isNew ? "invite" : "reset"}.eml`,
      buildInviteEml(issued.email, subject, html, plain)
    );
  }

  function sendWhatsApp() {
    const number = whatsAppNumber(issued.phone);
    const text = encodeURIComponent(plain);
    window.open(number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`, "_blank", "noopener");
  }

  return (
    <section className="ksl-card p-5">
      <h2 className="text-[15px] font-bold text-[#0b1f3a]">
        {issued.isNew ? "Invite ready" : "Password reset ready"}
      </h2>

      <div className="mt-4 rounded-[8px] bg-[#f6f8fa] px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-[12.5px] text-[#6b7785]">One-time passcode</p>
          <Button variant="secondary" size="sm" onClick={() => copyText(issued.passcode, "passcode")}>
            {copied === "passcode" ? <Check className="h-4 w-4 text-[#12b76a]" /> : <Copy className="h-4 w-4" />}
            {copied === "passcode" ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="mt-4 flex justify-center">
          <PasscodeDisplay value={issued.passcode} accepted={copied === "passcode"} />
        </div>
      </div>

      <div className="mt-3 rounded-[8px] bg-[#f6f8fa] px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-[12.5px] text-[#6b7785]">Sign-up link</p>
          <Button variant="secondary" size="sm" onClick={() => copyText(issued.signupUrl, "link")}>
            {copied === "link" ? <Check className="h-4 w-4 text-[#12b76a]" /> : <Copy className="h-4 w-4" />}
            {copied === "link" ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-2 break-all font-mono text-[13px] text-[#0b1f3a]">{issued.signupUrl}</p>
      </div>

      {previewHtml ? (
        <div className="mt-4 overflow-hidden rounded-[8px] border border-[#d7dee7] bg-[#eef2f6]">
          <iframe title="Invite email" srcDoc={previewHtml} className="h-[420px] w-full border-0 bg-white" />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ShareIconButton label="Gmail" disabled={!hasEmail} onClick={openMailDraft}>
          <GmailIcon className="h-11 w-11" />
        </ShareIconButton>
        <ShareIconButton label="Outlook" disabled={!hasEmail} onClick={openMailDraft}>
          <OutlookIcon className="h-11 w-11" />
        </ShareIconButton>
        <ShareIconButton label="WhatsApp" onClick={sendWhatsApp}>
          <WhatsAppIcon className="h-11 w-11" />
        </ShareIconButton>
        <Button className="ml-auto" onClick={onClose}>
          Done
        </Button>
      </div>
    </section>
  );
}

export function StaffManager() {
  const session = usePortalSession();
  const { toast, confirm } = useFeedback();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [permissions, setPermissions] = useState<PermRow[]>(emptyPerms());
  const [isAdmin, setIsAdmin] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [res, requestRes, inviteRes] = await Promise.all([
      fetch("/api/staff"),
      fetch("/api/staff/requests"),
      fetch("/api/staff/invites"),
    ]);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "Could not load the staff list.");
    else setStaff(data.staff);
    const requestData = await requestRes.json().catch(() => ({}));
    if (requestRes.ok) setRequests(requestData.requests ?? []);
    const inviteData = await inviteRes.json().catch(() => ({}));
    if (inviteRes.ok) setInvites(inviteData.invites ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function editAccess(next: PermRow[]) {
    setPermissions(next);
  }

  function openCreate() {
    setUsername("");
    setDisplayName("");
    setEmail("");
    setPhone("");
    setPermissions(emptyPerms());
    setIsAdmin(false);
    setJobTitle("");
    setError(null);
    setIssued(null);
    setPanel({ kind: "create" });
  }

  function openEdit(row: StaffRow) {
    setUsername(row.username);
    setDisplayName(row.display_name);
    setEmail(row.contact_email ?? "");
    const nextPermissions = permsFrom(row);
    setPermissions(nextPermissions);
    setIsAdmin(row.is_super_admin);
    setJobTitle(row.role_title ?? "");
    setError(null);
    setIssued(null);
    setPanel({ kind: "edit", row });
  }

  async function run<T>(task: () => Promise<T>) {
    setSaving(true);
    setError(null);
    try {
      return await task();
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setError("Add an email address or a mobile number.");
      return;
    }
    const problem = validateEmail(email.trim());
    if (problem) {
      setError(problem);
      return;
    }
    const role = isAdmin ? { title: null, error: null } : parseRoleTitle(jobTitle);
    if (role.error) {
      setError(role.error);
      return;
    }
    const data = await run(() =>
      sendJson("/api/staff/invites", "POST", {
        kind: "create",
        email,
        phone,
        permissions,
        superAdmin: isAdmin,
        roleTitle: role.title,
      })
    );
    if (data) {
      setPanel(null);
      setIssued({
        passcode: data.passcode,
        signupUrl: data.signupUrl,
        email: data.email || email.trim(),
        phone: data.phone || phone.trim(),
        isNew: true,
        expiresAt: data.expiresAt,
      });
      load();
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (panel?.kind !== "edit") return;
    const id = panel.row.id;
    const name = normalizeUsername(username);
    const role = isAdmin ? { title: null, error: null } : parseRoleTitle(jobTitle);
    const problem = validateUsername(name) ?? validateEmail(email.trim()) ?? role.error;
    if (problem) {
      setError(problem);
      return;
    }
    const ok = await run(async () => {
      await sendJson("/api/staff", "PATCH", { id, action: "profile", username: name, displayName, email, roleTitle: role.title, superAdmin: isAdmin });
      if (isAdmin !== panel.row.is_super_admin) {
        await sendJson("/api/staff", "PATCH", { id, action: "set_role", superAdmin: isAdmin });
      }
      if (!isAdmin) {
        await sendJson("/api/staff", "PATCH", { id, action: "permissions", permissions });
      }
      return true;
    });
    if (ok) {
      toast(`Changes saved for ${displayName || name}.`);
      setPanel(null);
      load();
    }
  }

  async function approveUsername(request: AccountRequest) {
    const data = await run(() => sendJson("/api/staff/requests", "POST", { id: request.id, action: "approve-username" }));
    if (data) toast(`${request.displayName || request.username} can now sign in as @${request.requestedUsername}.`);
    load();
  }

  async function sendRequestedPassword(request: AccountRequest) {
    const data = await run(() => sendJson("/api/staff/requests", "POST", { id: request.id, action: "approve-password" }));
    if (!data) return;
    setIssued({
      passcode: data.passcode,
      signupUrl: data.signupUrl,
      email: data.email ?? request.email ?? "",
      phone: data.phone ?? "",
      isNew: false,
      expiresAt: data.expiresAt,
      username: data.username,
    });
    load();
  }

  async function rejectRequest(request: AccountRequest) {
    const reason = (reasons[request.id] ?? "").trim();
    if (!reason) {
      setError("Write a reason for the rejection.");
      return;
    }
    const ok = await run(() => sendJson("/api/staff/requests", "POST", { id: request.id, action: "reject", reason }));
    if (ok) {
      toast(request.kind === "password" ? "Rejected. Their password is still the same." : "The request was rejected.");
      load();
    }
  }

  async function resetPassword(row: StaffRow) {
    let phoneForInvite = "";
    if (!row.contact_email) {
      phoneForInvite = window.prompt("No email on file. Enter a mobile number for the sign-up link:")?.trim() ?? "";
      if (!phoneForInvite) {
        setError("Add a contact email on their profile, or enter a mobile number to send a passcode.");
        return;
      }
    }
    const ok = await confirm({
      title: `Send ${row.display_name || row.username} a password reset?`,
      message: "They get a 6-digit passcode and a sign-up link. Their current password keeps working until they finish that link. The link lasts 10 minutes.",
      confirmLabel: "Create reset",
    });
    if (!ok) return;
    const data = await run(() =>
      sendJson("/api/staff", "PATCH", { id: row.id, action: "reset_password", phone: phoneForInvite || undefined })
    );
    if (data) {
      setPanel(null);
      setIssued({
        passcode: data.passcode,
        signupUrl: data.signupUrl,
        email: data.email || row.contact_email || "",
        phone: data.phone || phoneForInvite,
        isNew: false,
        expiresAt: data.expiresAt,
        username: row.username,
      });
      load();
    }
  }

  async function setActive(row: StaffRow, active: boolean) {
    if (!active) {
      const ok = await confirm({
        title: `Suspend ${row.display_name || row.username}?`,
        message: "They will not be able to sign in until you activate the account again.",
        confirmLabel: "Suspend",
        danger: true,
      });
      if (!ok) return;
    }
    const done = await run(() => sendJson("/api/staff", "PATCH", { id: row.id, action: "set_active", active }));
    if (done) {
      toast(active ? `${row.username} can sign in again.` : `${row.username} is suspended.`);
      load();
    }
  }

  async function remove(row: StaffRow) {
    const ok = await confirm({
      title: `Delete ${row.display_name || row.username}?`,
      message: row.must_change_password
        ? "This account never finished sign-up. It will be removed and they will not be able to sign in."
        : "The account goes to the recycle bin. They cannot sign in until you restore it.",
      confirmLabel: "Delete account",
      danger: true,
    });
    if (!ok) return;
    const done = await run(() => sendJson(`/api/staff?id=${encodeURIComponent(row.id)}`, "DELETE"));
    if (done) {
      toast(`${row.username} was moved to the recycle bin.`);
      load();
    }
  }

  async function deletePendingInvite(invite: PendingInvite) {
    const label = invite.email || invite.phone || invite.targetUsername || "this invite";
    const ok = await confirm({
      title: `Delete invite for ${label}?`,
      message: "Removes it from this list. Any open passcode and sign-up link stop working immediately. Expired invites are removed automatically.",
      confirmLabel: "Delete invite",
      danger: true,
    });
    if (!ok) return;
    const done = await run(() => sendJson(`/api/staff/invites?id=${encodeURIComponent(invite.id)}`, "DELETE"));
    if (done) {
      toast("Invite deleted.");
      if (issued) setIssued(null);
      load();
    }
  }

  async function resendInvite(invite: PendingInvite) {
    const data = await run(() =>
      sendJson("/api/staff/invites", "POST", {
        action: "resend",
        id: invite.id,
      })
    );
    if (!data) return;
    setPanel(null);
    setIssued({
      passcode: data.passcode,
      signupUrl: data.signupUrl,
      email: data.email || invite.email,
      phone: data.phone || invite.phone,
      isNew: invite.kind === "create",
      expiresAt: data.expiresAt,
      username: invite.targetUsername || undefined,
    });
    toast("Fresh passcode ready. Open Gmail, Outlook, or WhatsApp below to send it.");
    load();
  }

  async function resetPasswordFromInvite(invite: PendingInvite) {
    const profileId = invite.targetProfileId;
    if (!profileId) {
      setError("That account could not be found for a password reset.");
      return;
    }
    const label = invite.targetDisplayName || invite.targetUsername || invite.email || "this staff member";
    const ok = await confirm({
      title: `Send ${label} a password reset?`,
      message: "They already have an account. This sends a new passcode and link so they can set a new password.",
      confirmLabel: "Create reset",
    });
    if (!ok) return;
    const data = await run(() =>
      sendJson("/api/staff", "PATCH", {
        id: profileId,
        action: "reset_password",
        phone: invite.phone || undefined,
      })
    );
    if (!data) return;
    setPanel(null);
    setIssued({
      passcode: data.passcode,
      signupUrl: data.signupUrl,
      email: data.email || invite.email,
      phone: data.phone || invite.phone,
      isNew: false,
      expiresAt: data.expiresAt,
      username: invite.targetUsername || undefined,
    });
    toast("Password reset ready. Open Gmail, Outlook, or WhatsApp below to send it.");
    load();
  }

  function canDeleteRow(row: StaffRow) {
    if (row.id === session?.userId) return false;
    if (row.is_super_admin && !row.must_change_password) return false;
    return true;
  }

  function inviteStatusLabel(status: PendingInvite["status"]) {
    if (status === "waiting") return "Waiting";
    if (status === "expired") return "Expired";
    if (status === "completed") return "Completed";
    return "Cancelled";
  }

  const shownStaff = staff.filter((row) =>
    matchesSearch(query, row.display_name, row.username, row.contact_email, roleLabel(row.is_super_admin, row.role_title))
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading staff…
      </div>
    );
  }

  const inviteContact = (
    <>
      <Field label="Contact email" optional hint="Needed for Gmail/Outlook. Provide email or mobile (or both).">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </Field>
      <Field label="Mobile number" optional hint="Used for WhatsApp. Provide email or mobile (or both).">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="e.g. 0712 345 678" />
      </Field>
    </>
  );

  const editNameAndEmail = (
    <>
      <Field label="Full name">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Jane Kamau" required />
      </Field>
      <Field label="Contact email" optional>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </Field>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {error && <Notice kind="error">{error}</Notice>}

      {issued && <OneTimePasscodeBox issued={issued} onClose={() => setIssued(null)} />}

      {invites.length > 0 && !panel && !issued && (
        <section className="ksl-card p-5">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Sent invites</h2>
          <p className="mt-1 text-[13.5px] text-[#5b6775]">
            Waiting invites can be resent. After someone finishes sign-up, use Reset password instead. Delete removes an item from this list anytime.
          </p>
          <ul className="mt-4 divide-y divide-[#eef1f4]">
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-[#0b1f3a]">
                      {invite.kind === "create"
                        ? invite.email || invite.phone || "New staff invite"
                        : `Password reset · ${invite.targetDisplayName || invite.targetUsername || "staff account"}`}
                    </p>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
                        invite.status === "waiting"
                          ? "bg-[#fff4e5] text-[#b45309]"
                          : invite.status === "completed"
                            ? "bg-[#1b7a3d]/10 text-[#1b7a3d]"
                            : "bg-[#eef1f4] text-[#5b6775]"
                      )}
                    >
                      {inviteStatusLabel(invite.status)}
                    </span>
                  </div>
                  <p className="text-[13.5px] text-[#3d4c5f]">
                    {invite.kind === "create"
                      ? `${invite.isSuperAdmin ? "Administrator" : roleLabel(false, invite.roleTitle)} · ${
                          invite.status === "waiting"
                            ? `expires ${expiryLabel(invite.expiresAt) || "soon"} East Africa Time`
                            : invite.status === "expired"
                              ? `expired ${expiryLabel(invite.expiresAt) || ""}`
                              : "kept for your records"
                        }`
                      : invite.status === "waiting"
                        ? `Expires ${expiryLabel(invite.expiresAt) || "soon"} East Africa Time`
                        : "Kept for your records"}
                  </p>
                  {invite.status === "waiting" ? (
                    <p className="mt-1 break-all font-mono text-[12px] text-[#6b7785]">{invite.signupUrl}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {invite.status === "waiting" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(invite.signupUrl);
                          toast("Sign-up link copied.");
                        } catch {
                          setError("Could not copy the link.");
                        }
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy link
                    </Button>
                  ) : null}
                  {invite.status === "completed" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => resetPasswordFromInvite(invite)}
                      disabled={saving || !invite.targetProfileId}
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Reset password
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => resendInvite(invite)} disabled={saving}>
                      <KeyRound className="h-3.5 w-3.5" /> Resend
                    </Button>
                  )}
                  <Button variant="danger" size="sm" onClick={() => deletePendingInvite(invite)} disabled={saving} aria-label="Delete invite">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {requests.length > 0 && !issued && (
        <section className="ksl-card p-5">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Requests</h2>
          <p className="mt-1 text-[13.5px] text-[#5b6775]">
            Username changes are approved only when the name is free. A password request is answered with a sign-up link and a 6-digit passcode.
          </p>
          <ul className="mt-4 divide-y divide-[#eef1f4]">
            {requests.map((request) => (
              <li key={request.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="text-[14px] font-semibold text-[#0b1f3a]">
                    {request.displayName || request.username}
                    <span className="font-normal text-[#6b7785]"> @{request.username}</span>
                  </p>
                  <p className="text-[13.5px] text-[#3d4c5f]">
                    {request.kind === "username"
                      ? `Wants to sign in as @${request.requestedUsername}.`
                      : "Asked for a password change. Rejecting leaves their password as it is. Sending an invite lets them set a new password on the sign-up page."}
                  </p>
                </div>
                <Input
                  value={reasons[request.id] ?? ""}
                  onChange={(e) => setReasons((current) => ({ ...current, [request.id]: e.target.value }))}
                  placeholder="Reason, if you reject this"
                />
                <div className="flex flex-wrap gap-2">
                  {request.kind === "username" ? (
                    <Button onClick={() => approveUsername(request)} disabled={saving}>
                      Approve
                    </Button>
                  ) : (
                    <Button onClick={() => sendRequestedPassword(request)} disabled={saving}>
                      Send reset invite
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => rejectRequest(request)} disabled={saving}>
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!panel && !issued && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Invite staff
          </Button>
          <SearchBox value={query} onChange={setQuery} placeholder="Search by name, username or email" className="sm:w-[300px]" />
        </div>
      )}

      {panel?.kind === "create" && (
        <form onSubmit={submitCreate}>
          <FormSection title="Invite staff" description="Add email and/or mobile, then set their role. A 6-digit passcode and sign-up link are created when you save. They choose their own username and password on that link.">
            <FieldGrid className="lg:grid-cols-2">
              {inviteContact}
            </FieldGrid>
            <RoleFields isAdmin={isAdmin} jobTitle={jobTitle} onAdmin={setIsAdmin} onTitle={setJobTitle} />
            {isAdmin ? (
              <p className="text-[13.5px] text-[#5b6775]">This person will be able to open, change, publish, and remove items in every section, and manage other staff.</p>
            ) : (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#1f2933]">Access for every section</p>
                <p className="mb-2 text-[13px] text-[#5b6775]">{layoutHint(permissions)}</p>
                <AccessEditor permissions={permissions} onChange={editAccess} />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating invite…" : "Create invite"}
              </Button>
              <Button variant="secondary" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </div>
          </FormSection>
        </form>
      )}

      {panel?.kind === "edit" && (
        <form onSubmit={submitEdit}>
          <FormSection title={`Edit ${panel.row.display_name || panel.row.username}`}>
            <FieldGrid className="lg:grid-cols-3">
              <Field label="Username" hint="Used to sign in. Lowercase letters and numbers, no spaces.">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </Field>
              {editNameAndEmail}
            </FieldGrid>
            <RoleFields isAdmin={isAdmin} jobTitle={jobTitle} onAdmin={setIsAdmin} onTitle={setJobTitle} />
            {isAdmin ? (
              <p className="text-[13.5px] text-[#5b6775]">Administrators can do everything. Clear Administrator to type a role and set the sections.</p>
            ) : (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#1f2933]">Access for every section</p>
                <p className="mb-2 text-[13px] text-[#5b6775]">{layoutHint(permissions)}</p>
                <AccessEditor permissions={permissions} onChange={editAccess} />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="secondary" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </div>
          </FormSection>
        </form>
      )}

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-[13.5px]">
          <thead className="bg-[#f6f8fa] text-[#5b6775]">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Can work on</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shownStaff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#6b7785]">
                  No results found.{" "}
                  <button type="button" className="font-semibold text-[#0b1f3a] underline" onClick={() => setQuery("")}>
                    Clear search
                  </button>
                </td>
              </tr>
            )}
            {shownStaff.map((row) => (
              <tr key={row.id} className="border-t border-[#eef1f4] align-top">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={row.display_name || row.username} url={row.avatar_url} size={34} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0b1f3a]">{row.display_name || row.username}</p>
                      <p className="text-[12.5px] text-[#6b7785]">
                        {row.username}
                        {row.contact_email ? ` · ${row.contact_email}` : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#5b6775]">{roleLabel(row.is_super_admin, row.role_title)}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                      !row.is_active
                        ? "bg-[#fdecea] text-[#b42318]"
                        : row.must_change_password
                          ? "bg-[#fff4e5] text-[#b45309]"
                          : "bg-[#1b7a3d]/10 text-[#1b7a3d]"
                    )}
                  >
                    {!row.is_active ? "Suspended" : row.must_change_password ? "Waiting for first sign-in" : "Active"}
                  </span>
                </td>
                <td className="max-w-[280px] px-4 py-3 text-[#5b6775]">
                  {row.is_super_admin
                    ? "Everything"
                    : row.permissions
                        .filter((p) => p.can_view)
                        .map((p) => MODULE_LABELS[p.module_key])
                        .join(", ") || "Nothing yet"}
                </td>
                <td className="px-4 py-3">
                  {row.id === session?.userId ? (
                    <p className="text-right text-[12.5px] text-[#6b7785]">Your account</p>
                  ) : (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => resetPassword(row)} disabled={saving}>
                        <KeyRound className="h-3.5 w-3.5" /> Reset password
                      </Button>
                      {!row.is_super_admin && (
                        <Button variant="secondary" size="sm" onClick={() => setActive(row, !row.is_active)} disabled={saving}>
                          {row.is_active ? "Suspend" : "Activate"}
                        </Button>
                      )}
                      {canDeleteRow(row) && (
                        <Button variant="danger" size="sm" onClick={() => remove(row)} disabled={saving} aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { WebsiteMessageRow } from "@/lib/message-unlock";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

function fullName(row: Pick<WebsiteMessageRow, "first_name" | "other_name" | "surname">) {
  return [row.first_name, row.other_name, row.surname].filter(Boolean).join(" ");
}

export function forwardSubject(row: Pick<WebsiteMessageRow, "subject">) {
  const subj = row.subject.trim() || "Website contact";
  return subj.toLowerCase().startsWith("fwd:") ? subj : `Fwd: ${subj}`;
}

export function replySubject(row: Pick<WebsiteMessageRow, "subject">) {
  const subj = row.subject.trim() || "Website contact";
  return subj.toLowerCase().startsWith("re:") ? subj : `Re: ${subj}`;
}

export function forwardPlainBody(row: WebsiteMessageRow) {
  const lines = [
    "Kenya Shipyards Limited",
    "Website contact message (forwarded from the staff portal)",
    "",
    `From: ${fullName(row)}`,
    `Email: ${row.email}`,
    `Received: ${formatWhen(row.created_at)}`,
  ];
  if (row.preferred_contact) lines.push(`Preferred contact: ${row.preferred_contact}`);
  if (row.submitter_ip) lines.push(`Submitter IP: ${row.submitter_ip}`);
  if (row.risk_score != null && row.risk_score > 0) lines.push(`Risk score: ${row.risk_score}`);
  if (row.risk_flags?.length) lines.push(`Flags: ${row.risk_flags.join(", ")}`);
  lines.push("", "MESSAGE", "", row.message.trim() || "(empty)");
  return lines.join("\r\n");
}

export function replyPlainBody(row: WebsiteMessageRow) {
  const lines = [
    `Dear ${row.first_name || "Sir/Madam"},`,
    "",
    "",
    "",
    `On ${formatWhen(row.created_at)}, you wrote via kenyashipyards.co.ke:`,
    "",
    row.message.trim(),
  ];
  return lines.join("\r\n");
}

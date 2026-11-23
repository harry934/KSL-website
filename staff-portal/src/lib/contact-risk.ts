import {
  isAllowedContactMessage,
  isAllowedContactName,
  isAllowedContactSubject,
} from "@/lib/public-input-whitelist";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.de",
  "10minutemail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "trashmail.com",
]);

export type ContactRisk = { score: number; flags: string[] };

function bump(risk: ContactRisk, add: number, flag: string) {
  risk.score = Math.min(100, risk.score + add);
  if (!risk.flags.includes(flag)) risk.flags.push(flag);
}

/** Heuristic spam / abuse signals at submit time (no paid services). */
export function assessContactRisk(input: {
  firstName: string;
  otherName: string;
  surname: string;
  email: string;
  subject: string;
  message: string;
  encodingLayers?: string[];
}): ContactRisk {
  const risk: ContactRisk = { score: 0, flags: [] };
  const names = [input.firstName, input.otherName, input.surname].filter(Boolean);
  const fullName = names.join(" ");
  const message = input.message;
  const email = input.email.toLowerCase();

  if (names.some((part) => part && !isAllowedContactName(part))) bump(risk, 45, "suspicious_name");
  if (/(https?:\/\/|www\.)/i.test(fullName)) bump(risk, 40, "link_in_name");
  if (/\d{6,}/.test(fullName)) bump(risk, 20, "name_has_numbers");
  if (fullName.length > 4 && fullName === fullName.toUpperCase() && /[A-Z]/.test(fullName)) {
    bump(risk, 12, "all_caps_name");
  }
  if (/[^\p{L}\p{M}\s'.-]/u.test(fullName)) bump(risk, 15, "unusual_name_characters");

  const domain = email.includes("@") ? email.split("@")[1] ?? "" : "";
  if (domain && DISPOSABLE_DOMAINS.has(domain)) bump(risk, 35, "disposable_email");
  if (email.length > 72) bump(risk, 10, "long_email");
  if (!isAllowedContactSubject(input.subject) || !isAllowedContactMessage(message)) bump(risk, 50, "injection_pattern");

  const linkCount = (message.match(/https?:\/\/|www\.\S+/gi) ?? []).length;
  if (linkCount >= 1) bump(risk, 10, "contains_links");
  if (linkCount >= 3) bump(risk, 20, "many_links");
  if (message.length < 24 && linkCount > 0) bump(risk, 25, "short_message_with_link");

  if (/(.)\1{7,}/.test(message)) bump(risk, 18, "repeated_characters");

  const layers = input.encodingLayers ?? [];
  if (layers.length > 0) bump(risk, 8, "encoded_layers");
  if (layers.some((layer) => layer === "gzip" || layer === "base64" || layer === "base64_embedded")) {
    bump(risk, 15, "encoded_obfuscation");
  }

  if (risk.score >= 40) bump(risk, 0, "high_risk");

  return risk;
}

export const RISK_FLAG_LABELS: Record<string, string> = {
  suspicious_name: "Suspicious name",
  link_in_name: "Link in name",
  name_has_numbers: "Long number in name",
  all_caps_name: "All-caps name",
  unusual_name_characters: "Unusual name characters",
  disposable_email: "Disposable email",
  long_email: "Very long email",
  injection_pattern: "Code-like text",
  contains_links: "Contains links",
  many_links: "Many links",
  short_message_with_link: "Short note with link",
  repeated_characters: "Repeated characters",
  high_risk: "High risk",
  encoded_layers: "Encoded text",
  encoded_obfuscation: "Hidden encoding",
};

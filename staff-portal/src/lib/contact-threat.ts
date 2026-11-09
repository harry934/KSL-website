import type { ContactRisk } from "@/lib/contact-risk";

const IP_WORTHY = new Set([
  "injection_pattern",
  "encoded_obfuscation",
  "encoded_layers",
  "suspicious_name",
  "link_in_name",
  "high_risk",
]);

/** Keep submitter IP only when abuse or script like content was detected. */
export function shouldRetainSubmitterIp(risk: ContactRisk, blockedPayload: boolean) {
  if (blockedPayload) return true;
  if (risk.score >= 40) return true;
  return risk.flags.some((flag) => IP_WORTHY.has(flag));
}

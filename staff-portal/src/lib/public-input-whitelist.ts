/** Allowed character sets for public search and Contact Us (fail closed). */

export const PUBLIC_INPUT_LIMITS = {
  search: 120,
  name: 80,
  email: 200,
  subject: 160,
  message: 4000,
} as const;

const SEARCH_CHARS = /^[\p{L}\p{N}\s'.-]+$/u;
const NAME_CHARS = /^[\p{L}\p{M}\s'.-]+$/u;
const SUBJECT_CHARS = /^[\p{L}\p{N}\p{M}\s.,;:!?'"()[\]\-/&%+@#_]+$/u;

function hasControlChar(text: string) {
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i)!;
    if (cp < 32 && cp !== 9 && cp !== 10 && cp !== 13) return true;
    if (cp === 0x7f) return true;
    if (cp > 0xffff) i++;
  }
  return false;
}

/** Site header search and `?s=` on news. */
export function isAllowedPublicSearchQuery(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > PUBLIC_INPUT_LIMITS.search) return false;
  return SEARCH_CHARS.test(text);
}

/** First name or surname (non-empty). */
export function isAllowedContactName(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > PUBLIC_INPUT_LIMITS.name) return false;
  if (!NAME_CHARS.test(text) || !/\p{L}/u.test(text)) return false;
  return true;
}

/** Optional other / middle name. */
export function isAllowedContactNameOptional(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  return isAllowedContactName(text);
}

export function isAllowedContactEmail(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (!text || text.length > PUBLIC_INPUT_LIMITS.email) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return false;
  const [local, domain] = text.split("@");
  if (!local || !domain) return false;
  if (!/^[\p{L}\p{N}._%+\-]+$/u.test(local)) return false;
  if (!/^[\p{L}\p{N}.-]+$/u.test(domain)) return false;
  return true;
}

export function isAllowedContactSubject(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > PUBLIC_INPUT_LIMITS.subject) return false;
  return SUBJECT_CHARS.test(text);
}

/** Plain-text message: no markup, no control chars, no script URLs. */
export function isAllowedContactMessage(value: string): boolean {
  if (!value || value.length > PUBLIC_INPUT_LIMITS.message) return false;
  if (hasControlChar(value)) return false;
  if (value.includes("<") || value.includes(">")) return false;
  if (/(?:javascript|vbscript)\s*:/i.test(value)) return false;
  if (/data\s*:\s*text\/html/i.test(value)) return false;
  if (/\bon[a-z]{2,}\s*=/i.test(value)) return false;
  return true;
}
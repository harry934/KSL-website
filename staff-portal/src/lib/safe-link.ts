/**
 * Allow only schemes and paths safe for published site links.
 * Matches public-site KSL_SAFE_LINK plus same-site relative hero paths.
 */
export function safeLink(value: unknown, max = 500): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > max) return null;
  if (/[\s<>"'`]/.test(raw)) return null;
  if (/^(javascript|data|vbscript):/i.test(raw)) return null;
  if (raw.startsWith("//")) return null;

  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return raw.slice(0, max);
  if (/^(\/|#|[a-z0-9][a-z0-9./_-]*\.html)/i.test(raw)) return raw.slice(0, max);
  return null;
}

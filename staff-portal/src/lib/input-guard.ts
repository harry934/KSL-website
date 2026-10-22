/** True when text looks like code rather than a normal message. */
export function looksLikeCode(value: unknown) {
  const text = String(value ?? "");
  if (!text) return false;
  const decoded = text
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/&#x0*3c;?/gi, "<")
    .replace(/&#0*60;?/gi, "<")
    .replace(/&#x0*3e;?/gi, ">")
    .replace(/&#0*62;?/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/%3c/gi, "<")
    .replace(/%3e/gi, ">");
  return /<\s*\/?\s*(script|iframe|object|embed|svg|math|link|meta|style|base|form|img|video|source|body|html|xml)\b/i.test(decoded) ||
    /javascript\s*:/i.test(decoded) ||
    /vbscript\s*:/i.test(decoded) ||
    /data\s*:\s*text\/html/i.test(decoded) ||
    /\bon[a-z]+\s*=/i.test(decoded) ||
    /\b(document\.cookie|document\.write|eval\s*\()/i.test(decoded);
}

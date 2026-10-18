const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a"]);

/** Keeps the tags the story editor produces. Drops scripts and other markup. */
export function sanitizeRichHtml(input: string | null | undefined) {
  let html = String(input || "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|svg|math|link|meta)\b[\s\S]*?<\/\s*\1\s*>/gi, "");
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|svg|math|link|meta)\b[^>]*\/?\s*>/gi, "");
  html = html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, raw, attrs) => {
    const name = String(raw).toLowerCase();
    if (!ALLOWED.has(name)) return "";
    if (name === "br") return "<br>";
    if (full.startsWith("</")) return `</${name}>`;
    if (name !== "a") return `<${name}>`;
    const match = String(attrs).match(/\shref\s*=\s*("([^"]*)"|'([^']*)')/i);
    const href = (match?.[2] ?? match?.[3] ?? "").trim().replace(/"/g, "");
    if (!/^(https?:|mailto:|tel:)/i.test(href)) return "";
    return `<a href="${href}" rel="noopener noreferrer" target="_blank">`;
  });
  return html;
}

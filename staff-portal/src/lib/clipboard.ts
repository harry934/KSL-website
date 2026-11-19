/**
 * Clipboard helpers that work on HTTP (VPS IP) as well as HTTPS.
 * `navigator.clipboard` is unavailable outside a secure context.
 */

function legacyCopy(value: string) {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.width = "1px";
  area.style.height = "1px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, value.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

export async function copyPlainText(value: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fall through — common on http:// hostnames */
    }
  }
  return legacyCopy(value);
}

/** Prefer rich HTML when the browser allows it; always keep a plain-text fallback. */
export async function copyHtmlAndPlain(html: string, plain: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    navigator.clipboard?.write
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    } catch {
      /* fall through */
    }
  }
  return copyPlainText(plain);
}

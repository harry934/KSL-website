/**
 * Clipboard helpers that work on HTTP (VPS IP) as well as HTTPS.
 * `navigator.clipboard.write` is unavailable outside a secure context, so HTML
 * paste into Gmail must use the legacy copy-event path on http:// hosts.
 */

function legacyCopyPlain(value: string) {
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

/** Copies HTML + plain via the copy event (works on HTTP with a user gesture). */
function legacyCopyHtml(html: string, plain: string) {
  let ok = false;
  const onCopy = (event: ClipboardEvent) => {
    event.clipboardData?.setData("text/html", html);
    event.clipboardData?.setData("text/plain", plain);
    event.preventDefault();
    ok = true;
  };
  document.addEventListener("copy", onCopy);
  try {
    const bridge = document.createElement("div");
    bridge.contentEditable = "true";
    bridge.innerHTML = html;
    bridge.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden";
    document.body.appendChild(bridge);
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(bridge);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("copy");
    selection?.removeAllRanges();
    bridge.remove();
  } catch {
    ok = false;
  } finally {
    document.removeEventListener("copy", onCopy);
  }
  return ok || legacyCopyPlain(plain);
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
  return legacyCopyPlain(value);
}

/** Prefer rich HTML when the browser allows it; always keep a plain-text fallback. */
export async function copyHtmlAndPlain(html: string, plain: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    navigator.clipboard?.write &&
    window.isSecureContext
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
      /* fall through to copy-event path */
    }
  }
  return legacyCopyHtml(html, plain);
}

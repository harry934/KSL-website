import { signingOutCopy } from "@/lib/staff-session";

export type SignOutReason = "signedout" | "idle" | "elsewhere" | "suspended";

let leaving = false;

function showSigningOut(reason: SignOutReason) {
  if (document.getElementById("ksl-signing-out")) return;
  const panel = document.createElement("div");
  panel.id = "ksl-signing-out";
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-live", "assertive");
  panel.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483646",
    "display:grid",
    "place-items:center",
    "padding:24px",
    "background:#0b1f3a",
    "color:#fff",
    "text-align:center",
    "font:600 18px/1.45 Manrope,sans-serif",
  ].join(";");
  const text = document.createElement("p");
  text.textContent = signingOutCopy(reason);
  panel.appendChild(text);
  document.body.appendChild(panel);
}

export async function signOutNow(reason: SignOutReason) {
  if (leaving) return;
  leaving = true;
  showSigningOut(reason);
  await Promise.race([
    fetch("/api/auth/sign-out", { method: "POST" }).catch(() => null),
    new Promise((resolve) => window.setTimeout(resolve, 4000)),
  ]);
  window.location.href = `/login?reason=${reason}`;
}

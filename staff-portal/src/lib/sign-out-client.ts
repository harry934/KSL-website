export type SignOutReason = "signedout" | "idle" | "elsewhere" | "suspended";

let leaving = false;

export async function signOutNow(reason: SignOutReason) {
  if (leaving) return;
  leaving = true;
  await Promise.race([
    fetch("/api/auth/sign-out", { method: "POST" }).catch(() => null),
    new Promise((resolve) => window.setTimeout(resolve, 4000)),
  ]);
  window.location.href = `/login?reason=${reason}`;
}

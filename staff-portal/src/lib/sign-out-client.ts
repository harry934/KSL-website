let leaving = false;

export async function signOutNow() {
  if (leaving) return;
  leaving = true;
  await Promise.race([
    fetch("/api/auth/sign-out", { method: "POST" }).catch(() => null),
    new Promise((resolve) => window.setTimeout(resolve, 4000)),
  ]);
  window.location.href = "/login";
}

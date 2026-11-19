import { appPath } from "@/lib/base-path";
let leaving = false;

export async function signOutNow() {
  if (leaving) return;
  leaving = true;
  await Promise.race([
    fetch(appPath("/api/auth/sign-out"), { method: "POST" }).catch(() => null),
    new Promise((resolve) => window.setTimeout(resolve, 4000)),
  ]);
  window.location.href = appPath("/login");
}

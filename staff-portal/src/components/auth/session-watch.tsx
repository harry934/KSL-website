"use client";

import { useEffect } from "react";
import { IDLE_MS } from "@/lib/staff-session";
import { signOutNow } from "@/lib/sign-out-client";
import { appPath } from "@/lib/base-path";

const CHECK_MS = 20 * 1000;

export function SessionWatch() {
  useEffect(() => {
    let lastActive = Date.now();
    let lastPulse = 0;
    let stopped = false;

    function markActive() {
      lastActive = Date.now();
      if (stopped || lastActive - lastPulse < 60 * 1000) return;
      lastPulse = lastActive;
      fetch(appPath("/api/auth/pulse"), { method: "POST" })
        .then(async (res) => {
          if (res.ok || stopped) return;
          stopped = true;
          void signOutNow();
        })
        .catch(() => null);
    }

    async function check() {
      if (stopped) return;
      if (Date.now() - lastActive >= IDLE_MS) {
        stopped = true;
        await signOutNow();
        return;
      }
      const res = await fetch(appPath("/api/auth/session")).catch(() => null);
      if (!res || res.ok || stopped) return;
      stopped = true;
      await signOutNow();
    }

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, markActive, { passive: true }));
    markActive();
    const timer = window.setInterval(check, CHECK_MS);
    function onVisible() {
      if (document.visibilityState === "visible") void check();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      events.forEach((name) => window.removeEventListener(name, markActive));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}

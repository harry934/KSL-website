"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { signOutNow } from "@/lib/sign-out-client";

export function SignOutButton({ className, children = "Sign out" }: { className?: string; children?: React.ReactNode }) {
  const [leaving, setLeaving] = useState(false);

  return (
    <button
      type="button"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        void signOutNow();
      }}
      className={cn("text-[13px] font-semibold text-[#5b6775] hover:text-[#0b1f3a] hover:underline disabled:cursor-wait disabled:no-underline", className)}
    >
      {leaving ? "Signing out…" : children}
    </button>
  );
}

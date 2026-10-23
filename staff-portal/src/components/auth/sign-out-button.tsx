"use client";

import { cn } from "@/lib/cn";
import { signOutNow } from "@/lib/sign-out-client";

export function SignOutButton({ className, children = "Sign out" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => void signOutNow("signedout")} className={cn("text-[13px] font-semibold text-[#5b6775] hover:text-[#0b1f3a] hover:underline", className)}>
      {children}
    </button>
  );
}

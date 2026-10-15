"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export function SignOutButton({ className, children = "Sign out" }: { className?: string; children?: React.ReactNode }) {
  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={signOut} className={cn("text-[13px] font-semibold text-[#5b6775] hover:text-[#0b1f3a] hover:underline", className)}>
      {children}
    </button>
  );
}

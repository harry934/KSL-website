"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Reloads the dashboard figures without a full browser refresh. */
export function DashboardRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      onClick={() => start(() => router.refresh())}
    >
      <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      {pending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** On a phone the storage meters stay closed until they are opened. Wider screens show them straight away. */
export function UsageFold({ tight, children }: { tight: boolean; children: React.ReactNode }) {
  return (
    <details className={cn("storage-fold", tight && "is-tight")}>
      <summary className="storage-fold-toggle">
        <span>{tight ? "Storage is over 80% full" : "Storage and database"}</span>
        <ChevronDown className="storage-fold-chevron h-4 w-4" aria-hidden />
      </summary>
      <div className="storage-fold-body">{children}</div>
    </details>
  );
}

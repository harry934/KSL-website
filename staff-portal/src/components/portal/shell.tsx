import { Sidebar } from "@/components/portal/sidebar";
import { KslMotif } from "@/components/brand/ksl-motif";
import type { StaffSession } from "@/lib/session";

export function PortalShell({
  session,
  children,
}: {
  session: StaffSession;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FB]">
      <div className="h-1.5 shrink-0 bg-gradient-to-r from-[#09296C] via-[#0A3E95] to-[#0165FC]" aria-hidden />
      <div className="flex min-h-0 flex-1">
        <Sidebar session={session} />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <KslMotif className="pointer-events-none absolute -right-16 top-8 h-[min(420px,50vh)] w-[min(420px,45vw)] opacity-[0.07]" />
          <main className="relative z-10 flex-1 overflow-auto px-8 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

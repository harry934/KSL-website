import { Sidebar } from "@/components/portal/sidebar";
import type { StaffSession } from "@/lib/session";

export function PortalShell({
  session,
  title,
  children,
}: {
  session: StaffSession;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0B1F3F] text-slate-100">
      <Sidebar session={session} />
      <div className="flex min-w-0 flex-1 flex-col">
        {title ? (
          <header className="border-b border-white/10 bg-[#0d2847]/80 px-8 py-5 backdrop-blur">
            <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
          </header>
        ) : null}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}

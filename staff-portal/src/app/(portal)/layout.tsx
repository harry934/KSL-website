import { PortalShell } from "@/components/portal/shell";
import { getStaffSession } from "@/lib/session";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B1F3F] px-6 text-center">
        <h1 className="text-xl font-semibold text-white">Account not activated</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Your login exists but no staff profile is linked yet. Ask a super admin to invite you, or run the
          bootstrap script if you are setting up the first account.
        </p>
        <Link href="/login" className="mt-6">
          <Button variant="secondary">Back to sign in</Button>
        </Link>
      </div>
    );
  }

  return <PortalShell session={session}>{children}</PortalShell>;
}

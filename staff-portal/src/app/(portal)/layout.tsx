import Image from "next/image";
import Link from "next/link";
import { PortalShell } from "@/components/portal/shell";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { getStaffSession } from "@/lib/session";
import kslLogo from "../../../public/ksl-logo.png";

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f8] pt-[6px]">
      <div className="kenya-stripe" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Image src={kslLogo} alt="Kenya Shipyards Limited" width={60} height={60} unoptimized className="mx-auto" />
            <h1 className="mt-4 text-xl font-bold text-[#0b1f3a]">{title}</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();

  if (!session) {
    return (
      <Gate title="Account not active">
        <div className="ksl-card border-t-[3px] border-t-[#c5a028] p-6 text-center">
          <p className="text-sm text-[#5b6775]">
            This sign-in has no active staff profile. Ask the super admin to activate your account.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-[2px] border border-[#0b1f3a] px-[13px] py-2 text-[13px] font-semibold text-[#0b1f3a] hover:border-[#c5a028]"
          >
            Back to sign in
          </Link>
        </div>
      </Gate>
    );
  }

  if (session.mustChangePassword) {
    return (
      <Gate title="Set a new password">
        <p className="mb-4 text-center text-sm text-[#5b6775]">
          Your password was set by an administrator. Choose your own password to continue.
        </p>
        <ChangePasswordForm forced />
      </Gate>
    );
  }

  return <PortalShell session={session}>{children}</PortalShell>;
}

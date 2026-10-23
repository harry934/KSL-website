import Image from "next/image";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/shell";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { SessionWatch } from "@/components/auth/session-watch";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { staffGate } from "@/lib/session";
import kslLogo from "../../../public/ksl-logo.png";

function Gate({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0b1f3a] pt-[6px]">
      <div className="kenya-stripe" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="grid min-h-[calc(100vh-6px)] place-items-center px-4 py-9 sm:px-6">
        <section className="w-full max-w-[500px] rounded-[10px] border border-[#d6dee8] bg-white px-[18px] pb-[18px] pt-[22px] shadow-[0_14px_34px_rgba(11,31,58,0.22)] sm:px-[30px] sm:pb-6 sm:pt-[30px]">
          <Image src={kslLogo} alt="Kenya Shipyards Limited" width={72} height={72} unoptimized className="mx-auto mb-3 h-[72px] w-[72px] object-contain" />
          <h1 className="text-center text-[20px] font-bold text-[#0b1f3a]">{title}</h1>
          <p className="mb-5 mt-2 text-center text-[14px] text-[#5b6775]">{intro}</p>
          {children}
        </section>
      </div>
    </div>
  );
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const gate = await staffGate();
  if (gate.state === "out") redirect(`/login?reason=${gate.reason}`);
  if (gate.state === "suspended") {
    return (
      <Gate title="Your account is suspended" intro="You cannot use the portal right now. Contact an administrator.">
        <div className="text-center">
          <SignOutButton className="inline-flex h-[40px] items-center rounded-[6px] border border-[#d5dce4] px-4 text-[#0b1f3a] hover:bg-[#f4f6f8] hover:no-underline" />
        </div>
      </Gate>
    );
  }

  const session = gate.session;

  if (session.mustChangePassword || session.mustChangeUsername) {
    const firstSignIn = session.mustChangeUsername;
    return (
      <Gate
        title={firstSignIn ? "Choose your sign-in" : "Choose your own password"}
        intro={
          firstSignIn
            ? "This is your first sign-in. Choose your own username and password to continue."
            : "You signed in with a one-time password. Choose a password only you know to continue."
        }
      >
        <SessionWatch />
        <ChangePasswordForm forced changeUsername={firstSignIn} />
        <div className="mt-4 text-center">
          <SignOutButton />
        </div>
      </Gate>
    );
  }

  return (
    <>
      <SessionWatch />
      <PortalShell session={session}>{children}</PortalShell>
    </>
  );
}

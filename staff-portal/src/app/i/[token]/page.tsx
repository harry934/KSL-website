import Image from "next/image";
import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { loadOpenInvite } from "@/lib/staff-invites";
import kslLogo from "../../../../public/ksl-logo.png";

export const metadata = {
  title: "Sign up Kenya Shipyards Limited",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: raw } = await params;
  const token = String(raw ?? "").trim();
  const invite = token ? await loadOpenInvite(token) : null;

  return (
    <div className="relative min-h-screen bg-[#0b1f3a] pt-[6px]">
      <div className="kenya-stripe" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="flex min-h-[calc(100vh-6px)] flex-col items-center px-4 py-8 sm:px-6">
        <section className="my-auto w-full max-w-[500px] rounded-[10px] border border-[#d6dee8] bg-white px-[18px] pb-[18px] pt-[22px] shadow-[0_14px_34px_rgba(11,31,58,0.22)] sm:px-[30px] sm:pb-6 sm:pt-[30px]">
          <Image
            src={kslLogo}
            alt="Kenya Shipyards Limited"
            width={96}
            height={96}
            priority
            unoptimized
            className="mx-auto mb-3 h-24 w-24 object-contain"
          />
          <p className="mb-1.5 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-[#c5a028]">Ministry of Defence</p>
          <h1 className="text-center text-[20px] font-bold text-[#0b1f3a]">Kenya Shipyards Limited</h1>
          <p className="mb-4 mt-2 text-center text-[14px] text-[#5b6775]">Staff sign-up</p>

          <div className="rounded-[8px] border border-[#e3e8ee] bg-white p-4 text-left sm:p-5">
            {invite ? (
              <>
                <strong className="mb-1 block text-[15px] text-[#0b1f3a]">Enter your one-time passcode</strong>
                <p className="mb-4 text-[13.5px] text-[#5b6775]">Enter the 6-digit passcode from your administrator.</p>
                <SignupForm token={token} />
              </>
            ) : (
              <>
                <strong className="block text-center text-[15px] text-[#0b1f3a]">Link expired</strong>
                <p className="mt-4 text-center text-[13.5px] text-[#5b6775]">
                  <Link href="/login" className="font-semibold text-[#0b1f3a] underline">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

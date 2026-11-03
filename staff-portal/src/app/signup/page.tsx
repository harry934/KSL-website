import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import kslLogo from "../../../public/ksl-logo.png";

export const metadata = {
  title: "Sign up Kenya Shipyards Limited",
  robots: { index: false, follow: false },
};

/** Old links used /signup?t=… — send people to the short /i/… path when possible. */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  const token = String(params.t ?? "").trim();
  if (token) redirect(`/i/${encodeURIComponent(token)}`);

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
            <strong className="mb-1 block text-[15px] text-[#0b1f3a]">Invite link needed</strong>
            <p className="mb-4 text-[13.5px] text-[#5b6775]">
              Open the short sign-up link from your administrator. Invite links stop working after 10 minutes.
            </p>
            <p className="text-[13.5px] text-[#5b6775]">
              Already finished sign-up?{" "}
              <Link href="/login" className="font-semibold text-[#0b1f3a] underline">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

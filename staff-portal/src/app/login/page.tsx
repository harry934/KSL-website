import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import kslLogo from "../../../public/ksl-logo.png";

export const metadata = {
  title: "Sign in — KSL Content portal",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#f4f6f8] pt-[6px]">
      <div className="kenya-stripe" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="ksl-login-stage relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 text-center">
            <Image
              src={kslLogo}
              alt="Kenya Shipyards Limited"
              width={72}
              height={72}
              priority
              unoptimized
              className="mx-auto"
            />
            <p className="ksl-kicker mt-5">Kenya Shipyards Limited</p>
            <h1 className="mt-2 text-2xl font-bold text-[#0b1f3a]">Content portal</h1>
            <div className="ksl-gold-rule mx-auto mt-3" />
            <p className="mt-4 text-sm text-[#5b6775]">Staff sign-in only. No public registration.</p>
          </div>
          <div className="ksl-card border-t-[3px] border-t-[#c5a028] p-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

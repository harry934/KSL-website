import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import kslLogo from "../../../public/ksl-logo.png";

export const metadata = {
  title: "Sign in — KSL Content portal",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#F7F9FB]">
      <div className="h-1.5 bg-gradient-to-r from-[#09296C] via-[#0A3E95] to-[#0165FC]" />
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
              className="mx-auto rounded-full border border-[#DDE5F0] bg-white p-1 shadow-sm"
            />
            <p className="ksl-kicker mt-5">Kenya Shipyards Limited</p>
            <h1 className="ksl-display mt-2 text-2xl font-semibold text-[#09296C]">Content portal</h1>
            <div className="ksl-gold-rule mx-auto mt-3" />
            <p className="mt-4 text-sm text-[#5c6578]">Staff sign-in only. No public registration.</p>
          </div>
          <div className="ksl-card p-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

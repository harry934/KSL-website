import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in — KSL Content portal",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B1F3F] px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #1a4a8a 0%, transparent 45%), radial-gradient(circle at 80% 80%, #C4A35A22 0%, transparent 40%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C4A35A]">Kenya Shipyards</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Content portal</h1>
          <p className="mt-2 text-sm text-slate-400">Staff sign-in only. No public registration.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d2847]/90 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

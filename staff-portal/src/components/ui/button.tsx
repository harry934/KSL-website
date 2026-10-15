import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-[#C4A35A] text-[#0B1F3F] hover:bg-[#d4b36a] shadow-sm shadow-[#C4A35A]/25",
  secondary:
    "bg-white/10 text-white border border-white/15 hover:bg-white/15",
  ghost: "text-slate-300 hover:bg-white/10 hover:text-white",
  danger: "bg-red-600/90 text-white hover:bg-red-600",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A35A] disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});

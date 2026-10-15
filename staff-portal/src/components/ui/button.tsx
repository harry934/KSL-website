import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "gold" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-[#0165FC] text-white hover:bg-[#0A3E95] border border-[#0A3E95] shadow-sm",
  gold:
    "bg-[#99792c] text-white hover:bg-[#7a6122] border border-[#99792c] shadow-sm",
  secondary:
    "bg-white text-[#09296C] border border-[#DDE5F0] hover:border-[#0165FC]/40 hover:bg-[#F7F9FB]",
  ghost: "text-[#5c6578] hover:bg-[#F7F9FB] hover:text-[#09296C]",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0165FC] disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});

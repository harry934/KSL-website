import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "gold" | "secondary" | "outline" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-[#0b1f3a] text-white border-[#0b1f3a] hover:bg-transparent hover:text-[#0b1f3a]",
  gold: "bg-[#c5a028] text-[#0b1f3a] border-[#c5a028] hover:bg-transparent",
  secondary: "bg-white text-[#0b1f3a] border-[#0b1f3a] hover:border-[#c5a028]",
  outline: "bg-transparent text-[#0b1f3a] border-[#0b1f3a] hover:border-[#c5a028]",
  ghost: "border-transparent text-[#5b6775] hover:bg-[#f4f6f8] hover:text-[#0b1f3a]",
  danger: "bg-[#b42318] text-white border-[#b42318] hover:bg-transparent hover:text-[#b42318]",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[2px] border px-[13px] py-2 text-[13px] font-semibold transition hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c5a028] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});

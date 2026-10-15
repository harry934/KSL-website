import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "gold" | "secondary" | "outline" | "ghost" | "danger";
type Size = "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-[#0b1f3a] text-white border-[#0b1f3a] hover:bg-[#123056] hover:border-[#123056]",
  gold: "bg-[#c5a028] text-[#0b1f3a] border-[#c5a028] hover:bg-[#b48f1c] hover:border-[#b48f1c]",
  secondary: "bg-white text-[#0b1f3a] border-[#d5dce4] hover:bg-[#f4f6f8] hover:border-[#c3ccd7]",
  outline: "bg-white text-[#0b1f3a] border-[#d5dce4] hover:bg-[#f4f6f8] hover:border-[#c3ccd7]",
  ghost: "border-transparent bg-transparent text-[#5b6775] hover:bg-[#eef2f6] hover:text-[#0b1f3a]",
  danger: "bg-white text-[#b42318] border-[#f0c7c3] hover:bg-[#fdf1f0] hover:border-[#e6a9a3]",
};

const sizes: Record<Size, string> = {
  md: "h-[40px] px-4 text-[14px]",
  sm: "h-[32px] px-3 text-[13px]",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = "primary", size = "md", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[6px] border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0b1f3a]/20 disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    />
  );
});

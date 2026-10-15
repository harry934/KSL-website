import { cn } from "@/lib/cn";
import { InputHTMLAttributes, forwardRef } from "react";

export const controlClass =
  "w-full min-w-0 rounded-[6px] border border-[#d5dce4] bg-[#f6f8fa] px-3 text-[14px] text-[#1f2933] placeholder:text-[#98a3b1] transition-colors hover:border-[#c3ccd7] focus:border-[#0b1f3a] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#0b1f3a]/10 disabled:cursor-not-allowed disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClass, "h-[42px]", className)} {...props} />;
  }
);

import { cn } from "@/lib/cn";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-white/10 bg-[#0f2d52] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#C4A35A]/60 focus:outline-none focus:ring-2 focus:ring-[#C4A35A]/20",
          className
        )}
        {...props}
      />
    );
  }
);

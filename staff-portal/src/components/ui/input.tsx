import { cn } from "@/lib/cn";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded border border-[#DDE5F0] bg-white px-3.5 py-2.5 text-sm text-[#14213d] placeholder:text-[#9aa3b5] focus:border-[#0165FC] focus:outline-none focus:ring-2 focus:ring-[#0165FC]/15",
          className
        )}
        {...props}
      />
    );
  }
);

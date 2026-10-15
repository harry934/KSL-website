import { cn } from "@/lib/cn";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full min-w-0 rounded-[2px] border border-[#b8c2cc] bg-white px-2.5 py-2 text-[13px] text-[#1f2933] placeholder:text-[#8f9aaa] focus:border-[#0b1f3a] focus:outline-none focus:ring-2 focus:ring-[#c5a028]/25",
          className
        )}
        {...props}
      />
    );
  }
);

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full border border-[#cbd3df] bg-white px-3 text-sm outline-none transition placeholder:text-[#8a94a3] disabled:cursor-not-allowed disabled:bg-[#f5f7fb] disabled:text-[#687384] focus:border-[#2d6f7f] focus:ring-2 focus:ring-[#d9ecef]",
        className,
      )}
      {...props}
    />
  );
}

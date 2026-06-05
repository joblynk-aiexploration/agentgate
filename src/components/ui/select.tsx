import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full border border-[#cbd3df] bg-white px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-[#f5f7fb] disabled:text-[#687384] focus:border-[#2d6f7f] focus:ring-2 focus:ring-[#d9ecef]",
        className,
      )}
      {...props}
    />
  );
}

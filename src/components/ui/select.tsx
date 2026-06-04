import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full border border-[#cbd3df] bg-white px-3 text-sm outline-none transition focus:border-[#2d6f7f]",
        className,
      )}
      {...props}
    />
  );
}

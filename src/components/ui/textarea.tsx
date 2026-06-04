import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full border border-[#cbd3df] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-[#8a94a3] focus:border-[#2d6f7f]",
        className,
      )}
      {...props}
    />
  );
}

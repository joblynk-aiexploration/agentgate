import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "slate" | "green" | "amber" | "red" | "blue";

const tones: Record<BadgeTone, string> = {
  slate: "border-[#cbd3df] bg-[#f5f7fb] text-[#34404a]",
  green: "border-[#b9d8ce] bg-[#eef8f4] text-[#20634f]",
  amber: "border-[#e6d1a7] bg-[#fff8e7] text-[#83611b]",
  red: "border-[#e6c6b7] bg-[#fff4ef] text-[#9d3f1f]",
  blue: "border-[#b9d2e4] bg-[#eef6fb] text-[#245f7b]",
};

export function Badge({
  children,
  className,
  tone = "slate",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

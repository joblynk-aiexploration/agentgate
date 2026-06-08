import type { HTMLAttributes, ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export function FilterBar({
  children,
  className,
  title = "Filters",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60",
        className,
      )}
      {...props}
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <SlidersHorizontal className="h-4 w-4 text-blue-700" aria-hidden />
        {title}
      </div>
      {children}
    </div>
  );
}

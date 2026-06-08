import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TimelineEntry = {
  id: string;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
};

export function Timeline({
  className,
  items,
}: {
  className?: string;
  items: TimelineEntry[];
}) {
  return (
    <ol className={cn("grid gap-0", className)}>
      {items.map((item, index) => (
        <li className="relative grid grid-cols-[28px_1fr] gap-3" key={item.id}>
          <div className="flex flex-col items-center">
            <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700">
              {item.icon ?? <span className="h-2 w-2 rounded-full bg-blue-700" />}
            </div>
            {index < items.length - 1 ? (
              <div className="h-full min-h-8 w-px bg-slate-200" />
            ) : null}
          </div>
          <div className="pb-5">
            <p className="text-sm font-semibold text-slate-950">{item.title}</p>
            {item.description ? (
              <div className="mt-1 text-sm leading-6 text-slate-600">
                {item.description}
              </div>
            ) : null}
            {item.meta ? <div className="mt-2 text-xs text-slate-500">{item.meta}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

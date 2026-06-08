import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type TabItem = {
  href: string;
  label: string;
  active?: boolean;
  count?: ReactNode;
};

export function Tabs({ items }: { items: TabItem[] }) {
  return (
    <div className="overflow-x-auto border-b border-slate-200">
      <nav className="flex min-w-max gap-1" aria-label="Tabs">
        {items.map((item) => (
          <Link
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition",
              item.active
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
            {item.count ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {item.count}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-9 text-center">
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-slate-500 shadow-sm">
        {icon ?? <Inbox className="h-8 w-8" aria-hidden />}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

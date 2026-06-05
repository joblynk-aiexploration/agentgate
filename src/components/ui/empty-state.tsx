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
    <div className="flex min-h-40 flex-col items-center justify-center border border-dashed border-[#cbd3df] bg-[#f8fafc] px-6 py-8 text-center">
      <div className="border border-[#d9dee8] bg-white p-3 text-[#687384] shadow-sm">
        {icon ?? <Inbox className="h-8 w-8" aria-hidden />}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-[#5c6470]">{description}</p>
    </div>
  );
}

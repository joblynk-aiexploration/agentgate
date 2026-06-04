import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#5c6470]">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[#111318]">
              {value}
            </p>
          </div>
          {icon ? (
            <div className="flex h-10 w-10 items-center justify-center border border-[#d9dee8] bg-[#f8fafc] text-[#2d6f7f]">
              {icon}
            </div>
          ) : null}
        </div>
        {detail ? <p className="mt-3 text-xs text-[#687384]">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

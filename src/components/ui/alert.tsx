import type { HTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type AlertTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<AlertTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-red-200 bg-red-50 text-red-900",
};

const icons: Record<AlertTone, ReactNode> = {
  info: <Info className="h-4 w-4" aria-hidden />,
  success: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  warning: <AlertTriangle className="h-4 w-4" aria-hidden />,
  danger: <AlertTriangle className="h-4 w-4" aria-hidden />,
};

export function Alert({
  children,
  className,
  tone = "info",
  title,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  title?: string;
  tone?: AlertTone;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm leading-6",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 shrink-0">{icons[tone]}</span>
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? "mt-1" : undefined}>{children}</div>
      </div>
    </div>
  );
}

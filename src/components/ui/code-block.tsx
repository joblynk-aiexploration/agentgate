import type { ReactNode } from "react";
import { CopyButton } from "@/components/ui/copy-button";

export function CodeBlock({
  children,
  code,
  language,
  title,
}: {
  children?: ReactNode;
  code: string;
  language?: string;
  title?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          {title ? <p className="text-sm font-semibold text-white">{title}</p> : null}
          {language ? (
            <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-400">
              {language}
            </p>
          ) : null}
        </div>
        <CopyButton className="h-8 border-slate-700 bg-slate-900 px-2 text-xs text-white hover:bg-slate-800" text={code} />
      </div>
      <pre className="max-h-96 overflow-auto p-4 text-xs leading-6 text-slate-100">
        <code>{children ?? code}</code>
      </pre>
    </div>
  );
}

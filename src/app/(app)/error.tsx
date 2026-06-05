"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="border border-[#e6c6b7] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9d3f1f]" aria-hidden />
          <div>
            <p className="text-sm font-semibold uppercase text-[#9d3f1f]">
              Workspace error
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#111318]">
              This protected view could not load
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#5c6470]">
              AgentGate keeps authorization server-side. If this error came from
              stale data or a transient request, retry the view. Otherwise return
              to the dashboard and continue the demo from there.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="bg-[#172326] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#22363b]"
                onClick={reset}
                type="button"
              >
                Retry
              </button>
              <Link
                className="border border-[#cbd3df] bg-white px-4 py-2 text-sm font-semibold text-[#172326] transition hover:bg-[#f5f7fb]"
                href="/dashboard"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

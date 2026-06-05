"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-6 py-10 text-[#16181d]">
      <section className="w-full max-w-xl border border-[#e6c6b7] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9d3f1f]" aria-hidden />
          <div>
            <p className="text-sm font-semibold uppercase text-[#9d3f1f]">
              Something went wrong
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#111318]">
              AgentGate could not load this view
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#5c6470]">
              The request failed before the page could finish rendering. Retry the
              view, and check the local server logs if it happens again.
            </p>
            <button
              className="mt-5 bg-[#172326] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#22363b]"
              onClick={reset}
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

const steps = [
  "Account",
  "Organization",
  "First agent",
  "API key",
];

export function OnboardingShell({
  activeStep,
  children,
  eyebrow = "AgentGate onboarding",
  title,
  description,
}: {
  activeStep: number;
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-6 py-8 text-[#16181d] sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-[#d9dee8] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link className="inline-flex items-center gap-3" href="/">
              <ShieldCheck className="h-6 w-6 text-[#2d6f7f]" aria-hidden />
              <span className="text-lg font-semibold">AgentGate</span>
            </Link>
            <p className="mt-6 text-sm font-semibold uppercase text-[#4c6f68]">
              {eyebrow}
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5c6470]">
              {description}
            </p>
          </div>
          <ol className="grid gap-2 border border-[#d9dee8] bg-white p-4 shadow-sm sm:min-w-72">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === activeStep;
              const isComplete = stepNumber < activeStep;

              return (
                <li
                  className="flex items-center gap-3 text-sm"
                  key={step}
                >
                  <span
                    className={[
                      "flex h-7 w-7 items-center justify-center border text-xs font-semibold",
                      isActive
                        ? "border-[#172326] bg-[#172326] text-white"
                        : isComplete
                          ? "border-[#2d6f7f] bg-[#edf7f5] text-[#245f6b]"
                          : "border-[#d9dee8] bg-white text-[#687384]",
                    ].join(" ")}
                  >
                    {stepNumber}
                  </span>
                  <span
                    className={
                      isActive ? "font-semibold text-[#172326]" : "text-[#5c6470]"
                    }
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
        </header>

        {children}
      </div>
    </main>
  );
}

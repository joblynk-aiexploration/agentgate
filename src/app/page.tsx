import {
  ClipboardCheck,
  FileClock,
  PauseCircle,
  Route,
  ShieldCheck,
} from "lucide-react";

const flowSteps = [
  {
    title: "Gateway API",
    detail: "Receives the Support Refund Agent request for $1,200.",
    icon: Route,
  },
  {
    title: "Local Safety",
    detail: "Deterministic TypeScript rules score the request HIGH risk.",
    icon: ShieldCheck,
  },
  {
    title: "Approval Inbox",
    detail: "Refund policies require reviewer approval above $500.",
    icon: ClipboardCheck,
  },
  {
    title: "Audit Log",
    detail: "Every decision, reviewer action, and simulated result is recorded.",
    icon: FileClock,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#16181d]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-[#d9dee8] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[#4c6f68]">
              AgentGate
            </p>
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight text-[#111318] sm:text-5xl">
              Safety, approval, and audit layer for AI agents
            </h1>
          </div>
          <div className="flex w-full max-w-sm items-center gap-3 border border-[#cbd3df] bg-white px-4 py-3 shadow-sm md:w-auto">
            <PauseCircle className="h-5 w-5 text-[#b65332]" aria-hidden />
            <div>
              <p className="text-sm font-semibold">Paused agents return BLOCK</p>
              <p className="text-sm text-[#5c6470]">
                V1 simulates execution with local rules only.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          {flowSteps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                className="border border-[#d9dee8] bg-white p-5 shadow-sm"
                key={step.title}
              >
                <Icon className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
                <h2 className="mt-4 text-base font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5c6470]">
                  {step.detail}
                </p>
              </article>
            );
          })}
        </div>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[#d9dee8] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Demo Request</h2>
                <p className="mt-2 text-sm text-[#5c6470]">
                  Support Refund Agent wants to issue a production refund.
                </p>
              </div>
              <span className="border border-[#e6c6b7] bg-[#fff4ef] px-3 py-1 text-sm font-semibold text-[#9d3f1f]">
                HIGH risk
              </span>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-[#6d7580]">Action</dt>
                <dd className="mt-1 font-semibold">refund.create</dd>
              </div>
              <div>
                <dt className="text-sm text-[#6d7580]">Amount</dt>
                <dd className="mt-1 font-semibold">$1,200.00</dd>
              </div>
              <div>
                <dt className="text-sm text-[#6d7580]">Decision</dt>
                <dd className="mt-1 font-semibold">Require approval</dd>
              </div>
            </dl>
          </div>

          <div className="border border-[#d9dee8] bg-[#172326] p-6 text-white shadow-sm">
            <h2 className="text-xl font-semibold">Policy</h2>
            <p className="mt-3 text-sm leading-6 text-[#c8d6d8]">
              Refunds above $500 require a human reviewer. API keys identify
              agents, httpOnly sessions identify humans, and every tenant-owned
              query must include organization isolation.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

import {
  ClipboardCheck,
  FileClock,
  KeyRound,
  PauseCircle,
  Scale,
  Route,
  ShieldCheck,
  ToggleLeft,
} from "lucide-react";
import Link from "next/link";

const flowSteps = [
  {
    title: "Policies",
    detail: "Encode approval and block rules for sensitive tool actions.",
    icon: Scale,
  },
  {
    title: "Risk scoring",
    detail: "Local TypeScript rules score money movement, production access, and sensitive data.",
    icon: ShieldCheck,
  },
  {
    title: "Human approvals",
    detail: "Route high-risk actions to eligible reviewers before simulated execution.",
    icon: ClipboardCheck,
  },
  {
    title: "Audit logs",
    detail: "Record gateway checks, policy decisions, approvals, and kill-switch events.",
    icon: FileClock,
  },
  {
    title: "Kill switches",
    detail: "Pause risky agents or the organization to force gateway requests to BLOCK.",
    icon: ToggleLeft,
  },
  {
    title: "API gateway",
    detail: "Give agents one governed API layer in front of demo business tools.",
    icon: Route,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#16181d]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-[#d9dee8] pb-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-[#4c6f68]">
              AgentGate
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight text-[#111318] sm:text-5xl">
              The safety, approval, and audit layer for AI agents
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#4f5b68]">
              AgentGate sits between autonomous agents and business tools so
              sensitive actions can be scored, governed, approved, blocked, and
              audited before anything happens.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 bg-[#172326] px-4 text-sm font-semibold text-white transition hover:bg-[#22363b]"
                href="/login"
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                Login to demo
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center border border-[#cbd3df] bg-white px-4 text-sm font-semibold text-[#172326] transition hover:bg-[#f5f7fb]"
                href="/developer/docs"
              >
                View developer docs
              </Link>
            </div>
          </div>
          <div className="flex w-full max-w-sm items-center gap-3 border border-[#cbd3df] bg-white px-4 py-3 shadow-sm md:w-auto">
            <PauseCircle className="h-5 w-5 text-[#b65332]" aria-hidden />
            <div>
              <p className="text-sm font-semibold">Honest V1 demo</p>
              <p className="text-sm text-[#5c6470]">
                Local rules and demo integrations only. No paid AI APIs.
              </p>
            </div>
          </div>
        </header>

        <section className="border border-[#d9dee8] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#687384]">
            Governed tool path
          </p>
          <div className="mt-4 grid gap-3 text-center text-sm font-semibold text-[#172326] md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <div className="border border-[#d9dee8] bg-[#f8fafc] px-4 py-3">
              AI Agent
            </div>
            <span className="hidden text-[#687384] md:block">-&gt;</span>
            <div className="border border-[#2d6f7f] bg-[#eef6fb] px-4 py-3 text-[#245f7b]">
              AgentGate
            </div>
            <span className="hidden text-[#687384] md:block">-&gt;</span>
            <div className="border border-[#d9dee8] bg-[#f8fafc] px-4 py-3">
              Business Tool
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#5c6470]">
            In V1, business tools are simulated: no real Stripe refunds, emails,
            Slack messages, webhook deliveries, or database writes are performed.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

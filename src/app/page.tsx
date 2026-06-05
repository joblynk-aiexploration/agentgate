import Link from "next/link";
import {
  Bot,
  ClipboardCheck,
  FileClock,
  KeyRound,
  LockKeyhole,
  PauseCircle,
  Route,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  ToggleLeft,
} from "lucide-react";

const features = [
  {
    title: "Agent registry",
    detail: "Register agents, owners, departments, allowed tools, status, and risk tier.",
    icon: Bot,
  },
  {
    title: "API keys",
    detail: "Issue hashed agent/developer keys and show full keys only once.",
    icon: LockKeyhole,
  },
  {
    title: "Policy engine",
    detail: "Apply deterministic allow, approval, block, log-only, and sandbox rules.",
    icon: Scale,
  },
  {
    title: "Local safety engine",
    detail: "Score money movement, production access, sensitive data, and destructive actions.",
    icon: ShieldCheck,
  },
  {
    title: "Approval inbox",
    detail: "Route high-risk requests to human reviewers before simulated execution.",
    icon: ClipboardCheck,
  },
  {
    title: "Audit logs",
    detail: "Record gateway checks, decisions, approvals, blocks, execution, and admin events.",
    icon: FileClock,
  },
  {
    title: "Kill switch",
    detail: "Pause an agent or organization to force risky requests to BLOCK.",
    icon: ToggleLeft,
  },
  {
    title: "Demo integrations",
    detail: "Simulate Slack, Stripe test mode, Email Preview, Webhook Demo, and Postgres Demo.",
    icon: SlidersHorizontal,
  },
  {
    title: "Developer API",
    detail: "Use Gateway API, Tool Proxy mode, OpenAPI docs, and a TypeScript SDK starter.",
    icon: Terminal,
  },
];

function SectionCard({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="border border-[#d9dee8] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase text-[#4c6f68]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#111318]">{title}</h2>
      <div className="mt-4 text-sm leading-7 text-[#4f5b68]">{children}</div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#16181d]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-8 sm:px-8 lg:px-10">
        <header className="grid gap-8 border-b border-[#d9dee8] pb-10 lg:grid-cols-[1fr_360px] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-[#4c6f68]">
              AgentGate
            </p>
            <h1 className="mt-2 max-w-4xl text-4xl font-semibold leading-tight text-[#111318] sm:text-5xl">
              The safety, approval, and audit layer for AI agents.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4f5b68]">
              AgentGate lets companies safely deploy AI agents by controlling
              what every AI agent can access, change, spend, send, approve, and
              execute.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
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
              <Link
                className="inline-flex h-11 items-center justify-center border border-[#2d6f7f] bg-[#eef6fb] px-4 text-sm font-semibold text-[#245f7b] transition hover:bg-[#dceff6]"
                href="/demo"
              >
                View guided demo
              </Link>
            </div>
          </div>

          <aside className="border border-[#cbd3df] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <PauseCircle className="h-5 w-5 text-[#b65332]" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Honest V1 demo</p>
                <p className="mt-1 text-sm leading-6 text-[#5c6470]">
                  Local deterministic rules and demo integrations only. No paid
                  AI APIs and no real external tool actions.
                </p>
              </div>
            </div>
          </aside>
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
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard eyebrow="The problem" title="Agents can act in business systems.">
            <p>
              AI agents can send emails, issue refunds, update CRMs, change
              databases, and trigger workflows. That power is useful, but it
              turns every tool call into an operational control problem.
            </p>
          </SectionCard>
          <SectionCard eyebrow="The risk" title="Production access needs controls.">
            <p>
              Companies cannot let AI agents freely touch production systems
              without policy checks, approval paths, auditability, and emergency
              kill switches.
            </p>
          </SectionCard>
          <SectionCard eyebrow="The solution" title="A control plane between agent and tool.">
            <p>
              AgentGate adds policies, risk scoring, approvals, audit logs, kill
              switches, and gateway APIs before simulated business tool
              execution.
            </p>
          </SectionCard>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[#d9dee8] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase text-[#4c6f68]">
              Core demo
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#111318]">
              Support Refund Agent wants to refund $1,200.
            </h2>
            <div className="mt-6 grid gap-3 text-sm font-semibold text-[#172326] md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
              <div className="border border-[#d9dee8] bg-[#f8fafc] px-4 py-3">
                Refund request
              </div>
              <span className="hidden text-[#687384] md:block">-&gt;</span>
              <div className="border border-[#e6d1a7] bg-[#fff8e7] px-4 py-3 text-[#83611b]">
                Approval required
              </div>
              <span className="hidden text-[#687384] md:block">-&gt;</span>
              <div className="border border-[#b9d8ce] bg-[#eef8f4] px-4 py-3 text-[#20634f]">
                Audit log
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-[#4f5b68]">
              The local safety engine flags money movement, amount over $500,
              production environment, and payment/refund action. The policy
              engine requires human approval before simulated execution.
            </p>
          </div>

          <div className="border border-[#d9dee8] bg-[#172326] p-6 text-white shadow-sm">
            <Route className="h-5 w-5 text-[#8fc7bd]" aria-hidden />
            <h2 className="mt-4 text-2xl font-semibold">Gateway-first design</h2>
            <p className="mt-3 text-sm leading-7 text-[#c8d6d8]">
              AI Agent -&gt; AgentGate Gateway API -&gt; Local Safety Engine
              -&gt; Policy Decision -&gt; Approval Inbox -&gt; Audit Log.
            </p>
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase text-[#4c6f68]">Features</p>
            <h2 className="text-2xl font-semibold text-[#111318]">
              Built around the V1 governance loop
            </h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  className="border border-[#d9dee8] bg-white p-5 shadow-sm"
                  key={feature.title}
                >
                  <Icon className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
                  <h3 className="mt-4 text-base font-semibold text-[#172326]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5c6470]">
                    {feature.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border border-[#e6d1a7] bg-[#fff8e7] p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[#83611b]">
            V1 honesty
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#111318]">
            Demo integrations, local rules, no hidden magic.
          </h2>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-[#624916] md:grid-cols-3">
            <p>V1 uses local deterministic TypeScript risk and policy rules.</p>
            <p>No OpenAI, Anthropic, Gemini, or paid AI APIs are used.</p>
            <p>No real Stripe, Gmail, Slack, Postgres, or webhook actions run yet.</p>
          </div>
        </section>

        <section className="border border-[#d9dee8] bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-[#4c6f68]">
                Try the demo
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111318]">
                Follow the seeded approval flow end to end.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#4f5b68]">
                Login as owner or reviewer, send the demo refund check, approve
                or reject it, inspect the audit log, then pause the agent to see
                the same request return BLOCK.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
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
              <Link
                className="inline-flex h-11 items-center justify-center border border-[#2d6f7f] bg-[#eef6fb] px-4 text-sm font-semibold text-[#245f7b] transition hover:bg-[#dceff6]"
                href="/demo"
              >
                View guided demo
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

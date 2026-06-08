import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  FileClock,
  KeyRound,
  PauseCircle,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  ["Agent registry", "Owners, departments, allowed tools, status, and risk tiers.", Bot],
  ["API keys", "Hashed `ag_test_` keys with one-time reveal and optional agent scope.", KeyRound],
  ["Local safety engine", "Deterministic TypeScript rules for money, production, private data, and destructive actions.", ShieldCheck],
  ["Policy engine", "Allow, block, log, sandbox, or require human approval based on organization rules.", SlidersHorizontal],
  ["Approval inbox", "Human approval before risky simulated execution.", ClipboardCheck],
  ["Audit logs", "A tenant-scoped trail for gateway checks, approvals, blocks, and execution.", FileClock],
  ["Kill switches", "Pause an agent or organization to force unsafe requests to BLOCK.", PauseCircle],
  ["Developer API", "Gateway API, Tool Proxy mode, OpenAPI docs, and SDK starter.", Terminal],
  ["Ecommerce demo", "Northstar support agent proves real checkout-order governance.", Store],
] as const;

const trustItems = [
  "Local deterministic rules in V1",
  "No paid AI APIs",
  "No real external actions in the demo",
  "Server-side authorization",
  "Hashed API keys",
  "Tenant-scoped queries",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-6 py-8 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-950/40">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-lg font-semibold leading-none">AgentGate</span>
              <span className="mt-1 block text-xs text-slate-400">
                AI agent control plane
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link className="hidden text-sm font-semibold text-slate-300 hover:text-white sm:block" href="/developer/docs">
              Docs
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white px-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              href="/login"
            >
              Login to demo
            </Link>
          </div>
        </nav>

        <section className="grid gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-blue-400/30 bg-blue-400/10 text-blue-200" tone="blue">
                Local V1 demo
              </Badge>
              <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200" tone="green">
                No paid AI APIs
              </Badge>
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              AgentGate
            </h1>
            <p className="mt-4 max-w-3xl text-2xl font-medium leading-tight text-slate-200">
              The safety, approval, and audit layer for AI agents.
            </p>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              Control what AI agents can access, change, spend, send, approve,
              and execute before they touch business workflows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
                href="/login"
              >
                Login to demo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/developer/docs"
              >
                View developer docs
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/integrations/demo-commerce"
              >
                View ecommerce monitor
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-slate-950/60">
            <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                Architecture
              </p>
              <div className="mt-5 grid gap-3 text-sm font-semibold">
                {["AI Agent", "AgentGate Gateway", "Business Tool"].map((label, index) => (
                  <div className="flex items-center gap-3" key={label}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-blue-200">
                      {index === 0 ? <Bot className="h-5 w-5" aria-hidden /> : index === 1 ? <Route className="h-5 w-5" aria-hidden /> : <DatabaseZap className="h-5 w-5" aria-hidden />}
                    </div>
                    <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                Support Refund Agent requests $1,200 refund -&gt; HIGH risk -&gt;
                approval required -&gt; reviewer approves -&gt; audit log created.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Problem</p>
            <h2 className="mt-3 text-xl font-semibold">AI agents can act in production systems.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Agents can send emails, issue refunds, update CRMs, change databases,
              and trigger workflows. Companies need control before agents touch
              production systems.
            </p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Solution</p>
            <h2 className="mt-3 text-xl font-semibold">Policy-enforced agent actions.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              AgentGate adds policies, risk scoring, human approvals, audit logs,
              kill switches, and gateway APIs between agents and tools.
            </p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Demo</p>
            <h2 className="mt-3 text-xl font-semibold">A complete approval trail.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The seeded demo shows the $1,200 refund approval flow, blocked
              delete actions, ecommerce agent checks, and audit evidence.
            </p>
          </article>
        </section>

        <section>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
              Capabilities
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Governance controls for agentic workflows
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map(([title, detail, Icon]) => (
              <article
                className="rounded-xl border border-white/10 bg-white p-5 text-slate-950 shadow-xl shadow-slate-950/10"
                key={title}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white p-6 text-slate-950 shadow-xl shadow-slate-950/20">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Trust model</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Honest V1: simulated integrations, real control flow.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                AgentGate V1 proves the approval and audit layer without claiming
                live enterprise deployment, SOC 2, trained AI models, or real
                third-party execution.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700" key={item}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

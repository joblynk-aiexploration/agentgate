import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  ClipboardCheck,
  FileClock,
  KeyRound,
  PauseCircle,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";

const demoCurl = `curl -X POST http://localhost:3000/api/gateway/check \\
  -H "Authorization: Bearer ag_test_seed_support_refund_demo_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "support-refund-agent",
    "tool": "stripe",
    "action": "refund.create",
    "environment": "production",
    "amount": 1200,
    "currency": "USD",
    "reason": "Customer was double charged"
  }'`;

const riskSignals = [
  "money movement",
  "amount over $500",
  "production environment",
  "payment/refund action",
];

const demoLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/policies", label: "Policies" },
  { href: "/approvals", label: "Approvals" },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/developer/docs", label: "Developer Docs" },
];

const credentials = [
  "owner@agentgate.dev / Password123!",
  "reviewer@agentgate.dev / Password123!",
  "auditor@agentgate.dev / Password123!",
];

function StepCard({
  children,
  step,
  title,
}: {
  children: React.ReactNode;
  step: string;
  title: string;
}) {
  return (
    <article className="border border-[#d9dee8] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase text-[#4c6f68]">{step}</p>
      <h2 className="mt-2 text-xl font-semibold text-[#111318]">{title}</h2>
      <div className="mt-4 text-sm leading-6 text-[#34404a]">{children}</div>
    </article>
  );
}

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#16181d]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 sm:px-8 lg:px-10">
        <header className="grid gap-6 border-b border-[#d9dee8] pb-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-[#4c6f68]">
              Guided demo
            </p>
            <h1 className="mt-2 max-w-4xl text-4xl font-semibold leading-tight text-[#111318] sm:text-5xl">
              Watch AgentGate catch a high-risk AI agent action
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#4f5b68]">
              This page walks through the V1 seed scenario without requiring you
              to read the full README. AgentGate uses local rules, demo
              integrations, human approvals, and audit logs. No paid AI APIs or
              real external tools are used.
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

          <aside className="border border-[#e6d1a7] bg-[#fff8e7] p-4 text-sm leading-6 text-[#624916] lg:w-80">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                The seed API key is local-only demo material. Never use it in a
                real deployment.
              </p>
            </div>
          </aside>
        </header>

        <section className="grid gap-5">
          <StepCard step="Step 1" title="AI agent wants to refund $1,200.">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#2d6f7f]" aria-hidden />
              <p>
                The seeded Support Refund Agent asks to run{" "}
                <code className="font-mono">stripe/refund.create</code> in
                production because a customer was double charged.
              </p>
            </div>
          </StepCard>

          <StepCard step="Step 2" title="AgentGate checks risk.">
            <p>
              The local TypeScript safety engine scores the request before any
              simulated tool execution can happen.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {riskSignals.map((signal) => (
                <span
                  className="border border-[#e6c6b7] bg-[#fff4ef] px-2 py-1 text-xs font-semibold text-[#9d3f1f]"
                  key={signal}
                >
                  {signal}
                </span>
              ))}
            </div>
          </StepCard>

          <StepCard step="Step 3" title="Policy requires approval.">
            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4">
              <p className="font-semibold text-[#172326]">
                Refunds above $500 require approval.
              </p>
              <p className="mt-2">
                The policy engine returns{" "}
                <code className="font-mono">REQUIRE_APPROVAL</code>, so the
                request is held instead of executed.
              </p>
            </div>
            <Link className="mt-4 inline-flex font-semibold text-[#2d6f7f]" href="/policies">
              Open policies
            </Link>
          </StepCard>

          <StepCard step="Step 4" title="Approval request is created.">
            <p>
              A pending Approval Inbox item is created for an eligible reviewer.
              Open the seeded approval from the inbox to see the approval detail,
              risk explanation, payload, and metadata.
            </p>
            <Link className="mt-4 inline-flex font-semibold text-[#2d6f7f]" href="/approvals">
              Open approval inbox
            </Link>
          </StepCard>

          <StepCard step="Step 5" title="Reviewer approves or rejects.">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2d6f7f]" aria-hidden />
              <p>
                Log in as the reviewer, open the pending approval detail from the
                inbox, then approve or reject the request. V1 approval changes
                the action state only. External execution remains simulated.
              </p>
            </div>
            <Link className="mt-4 inline-flex font-semibold text-[#2d6f7f]" href="/approvals">
              Open approval detail from inbox
            </Link>
          </StepCard>

          <StepCard step="Step 6" title="Audit log records everything.">
            <div className="flex items-start gap-3">
              <FileClock className="mt-0.5 h-5 w-5 shrink-0 text-[#2d6f7f]" aria-hidden />
              <p>
                Gateway checks, policy decisions, approval requests, approval
                decisions, blocked actions, and kill-switch events are written to
                the organization audit trail.
              </p>
            </div>
            <Link className="mt-4 inline-flex font-semibold text-[#2d6f7f]" href="/audit-logs">
              Open audit logs
            </Link>
          </StepCard>

          <StepCard step="Step 7" title="Kill switch blocks unsafe agent.">
            <div className="flex items-start gap-3">
              <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#9d3f1f]" aria-hidden />
              <p>
                Pause the Support Refund Agent from the agent detail page, then
                send the same gateway request. AgentGate returns{" "}
                <code className="font-mono">BLOCK</code> because the agent is
                paused.
              </p>
            </div>
            <Link className="mt-4 inline-flex font-semibold text-[#2d6f7f]" href="/agents">
              Open agents
            </Link>
          </StepCard>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="border border-[#d9dee8] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
                  <h2 className="text-xl font-semibold">Copyable curl command</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5c6470]">
                  Run this after local seed. It returns{" "}
                  <code className="font-mono">REQUIRE_APPROVAL</code> for the
                  $1,200 production refund.
                </p>
              </div>
              <CopyButton label="Copy curl" text={demoCurl} />
            </div>
            <pre className="mt-5 overflow-x-auto border border-[#d9dee8] bg-[#11181c] p-4 text-xs leading-6 text-[#d8eeee]">
              <code>{demoCurl}</code>
            </pre>
          </div>

          <aside className="grid gap-5">
            <div className="border border-[#d9dee8] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Login credentials</h2>
              <div className="mt-4 grid gap-2 text-sm text-[#34404a]">
                {credentials.map((credential) => (
                  <p className="border border-[#edf1f6] bg-[#f8fafc] p-2" key={credential}>
                    {credential}
                  </p>
                ))}
              </div>
            </div>

            <div className="border border-[#d9dee8] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Demo links</h2>
              <div className="mt-4 grid gap-2">
                {demoLinks.map((link) => (
                  <Link
                    className="border border-[#d9dee8] bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-[#172326] transition hover:bg-[#edf1f6]"
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="border border-[#d9dee8] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3 text-sm leading-6 text-[#34404a]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2d6f7f]" aria-hidden />
            <p>
              AgentGate V1 is intentionally honest: local rules only, simulated
              demo integrations only, no real refunds, no real emails, no real
              Slack messages, no real database writes, and no paid AI APIs.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

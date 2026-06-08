import Link from "next/link";
import {
  BookOpen,
  Braces,
  FlaskConical,
  KeyRound,
  RadioTower,
  Route,
  Store,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole, roleRules } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function DeveloperPage() {
  const membership = await requireRole(roleRules.viewDeveloperDocs);
  const [activeApiKeys, activeAgents, gatewayChecks] = await Promise.all([
    prisma.apiKey.count({
      where: {
        organizationId: membership.organizationId,
        status: "ACTIVE",
      },
    }),
    prisma.agent.count({
      where: {
        organizationId: membership.organizationId,
        status: "ACTIVE",
      },
    }),
    prisma.actionRequest.count({
      where: {
        organizationId: membership.organizationId,
      },
    }),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Build agent integrations against the AgentGate gateway with hashed API keys and local deterministic safety decisions."
        eyebrow={membership.organization.slug}
        title="Developer"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          detail="Available for gateway authentication"
          icon={<KeyRound className="h-5 w-5" aria-hidden />}
          label="Active API keys"
          value={activeApiKeys}
        />
        <MetricCard
          detail="Registered active agents"
          icon={<RadioTower className="h-5 w-5" aria-hidden />}
          label="Active agents"
          value={activeAgents}
        />
        <MetricCard
          detail="Gateway check records"
          icon={<Route className="h-5 w-5" aria-hidden />}
          label="Gateway checks"
          value={gatewayChecks}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          className="border border-[#d9dee8] bg-white p-6 shadow-sm transition hover:border-[#2d6f7f]"
          href="/developer/api-keys"
        >
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
            <h2 className="text-lg font-semibold">API Keys</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#5c6470]">
            Create and revoke hashed `ag_test_` keys for agent gateway calls.
            Full keys are shown once and are never used for human login.
          </p>
        </Link>
        <Link
          className="border border-[#d9dee8] bg-white p-6 shadow-sm transition hover:border-[#2d6f7f]"
          href="/developer/docs"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
            <h2 className="text-lg font-semibold">Docs</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#5c6470]">
            Review gateway request shape, decision handling, approval flow, and
            V1 simulated execution behavior.
          </p>
        </Link>
        <Link
          className="border border-[#d9dee8] bg-white p-6 shadow-sm transition hover:border-[#2d6f7f]"
          href="/developer/agent-lab"
        >
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
            <h2 className="text-lg font-semibold">Agent Lab</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#5c6470]">
            Run the local Support Operations Agent from the browser and inspect
            decisions, risk signals, approvals, blocks, and simulated execution.
          </p>
        </Link>
        <Link
          className="border border-[#d9dee8] bg-white p-6 shadow-sm transition hover:border-[#2d6f7f]"
          href="/developer/webhooks"
        >
          <div className="flex items-center gap-3">
            <Webhook className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
            <h2 className="text-lg font-semibold">Webhooks</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#5c6470]">
            Configure demo-safe outbound callbacks for gateway decisions,
            approvals, blocks, executions, and kill-switch events.
          </p>
        </Link>
        <Link
          className="border border-[#d9dee8] bg-white p-6 shadow-sm transition hover:border-[#2d6f7f]"
          href="/integrations/demo-commerce"
        >
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-[#2d6f7f]" aria-hidden />
            <h2 className="text-lg font-semibold">Commerce Monitor</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#5c6470]">
            Watch Northstar ecommerce support-agent decisions, approvals, blocks,
            and audit trail entries generated through the Gateway API.
          </p>
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Gateway status</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#5c6470]">Organization status</dt>
                <dd>
                  <StatusBadge status={membership.organization.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#5c6470]">Kill switch</dt>
                <dd>
                  <StatusBadge status={membership.organization.killSwitchEnabled} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#5c6470]">Safety engine</dt>
                <dd className="font-semibold">Local rules only</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#5c6470]">External execution</dt>
                <dd className="font-semibold">Simulated in V1</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo API flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm leading-6 text-[#34404a]">
              <li>1. Register an agent and assign allowed tools.</li>
              <li>2. Create an `ag_test_` API key, optionally scoped to that agent.</li>
              <li>3. Call `POST /api/gateway/check` with tool, action, environment, and payload context.</li>
              <li>4. AgentGate runs local risk rules, evaluates policies, and returns ALLOW, REQUIRE_APPROVAL, BLOCK, LOG_ONLY, or SANDBOX_ONLY.</li>
              <li>5. If approval is required, review the request in the Approval Inbox before simulated execute.</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button href="/developer/docs" variant="secondary">
                <Braces className="h-4 w-4" aria-hidden />
                Read docs
              </Button>
              <Button href="/developer/agent-lab" variant="secondary">
                <FlaskConical className="h-4 w-4" aria-hidden />
                Agent Lab
              </Button>
              <Button href="/developer/webhooks" variant="secondary">
                <Webhook className="h-4 w-4" aria-hidden />
                Webhooks
              </Button>
              <Button href="/developer/api-keys">Manage API keys</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

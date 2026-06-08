import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ExternalLink,
  RadioTower,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  ActionDecision,
  type ActionRequest,
  type AuditLog,
  type MembershipRole,
} from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireMembership } from "@/lib/auth";
import { formatDateTime, formatEnumLabel, formatRelativeTime } from "@/lib/format";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const commerceAgentSlug = "demo-commerce-support-agent";
const commerceStoreUrl = "http://localhost:3004";
const agentGateUrl = "http://localhost:3001";

const viewerRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
  "reviewer",
  "auditor",
];

type ActionRow = Pick<
  ActionRequest,
  | "action"
  | "createdAt"
  | "decision"
  | "id"
  | "metadataJson"
  | "reason"
  | "riskLevel"
  | "riskScore"
  | "status"
  | "tool"
>;

type ApprovalRow = {
  actionRequest: ActionRow;
  createdAt: Date;
  id: string;
  status: string;
};

type AuditRow = Pick<
  AuditLog,
  "createdAt" | "eventType" | "id" | "metadataJson" | "targetId" | "targetType"
>;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readNested(
  value: Record<string, unknown>,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, value);
}

function safeString(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  return String(value);
}

function metadataValue(metadata: unknown, ...paths: string[]) {
  const record = asRecord(metadata);

  for (const path of paths) {
    const value = safeString(readNested(record, path));

    if (value) {
      return value;
    }
  }

  return null;
}

function orderCustomerSummary(metadata: unknown) {
  const order =
    metadataValue(metadata, "orderId", "payload.orderId", "metadata.orderId") ??
    "Unknown order";
  const customer =
    metadataValue(
      metadata,
      "customerEmail",
      "payload.customerEmail",
      "metadata.customerEmail",
      "recipient",
      "payload.recipient",
    ) ?? "Unknown customer";

  return `${order} / ${customer}`;
}

function safeMetadataSummary(metadata: unknown) {
  const record = asRecord(metadata);
  const redactedKeys = new Set([
    "apikey",
    "api_key",
    "authorization",
    "bearer",
    "password",
    "secret",
    "token",
  ]);
  const entries = Object.entries(record)
    .filter(([key]) => !redactedKeys.has(key.toLowerCase()))
    .slice(0, 4);

  if (entries.length === 0) {
    return "No metadata";
  }

  return entries
    .map(([key, value]) => {
      if (value == null) {
        return `${key}: null`;
      }

      if (typeof value === "object") {
        return `${key}: ${Array.isArray(value) ? "array" : "object"}`;
      }

      return `${key}: ${String(value)}`;
    })
    .join(", ");
}

function ActionLink({ id }: { id: string }) {
  return (
    <Link className="font-mono text-xs font-semibold text-[#2d6f7f]" href={`/actions/${id}`}>
      {id}
    </Link>
  );
}

function MissingCommerceAgent() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="The Northstar demo commerce agent is created by the local demo seed."
        title="Demo Commerce Monitor"
      />
      <Card>
        <CardContent className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[#9d3f1f]" aria-hidden />
          <div>
            <h2 className="font-semibold">Demo commerce agent not found</h2>
            <p className="mt-2 text-sm leading-6 text-[#5c6470]">
              Run <code>npm run demo:reset</code> to create the
              <code> demo-commerce-support-agent</code> seed data, then run the
              Northstar commerce scenarios again.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default async function DemoCommerceMonitorPage() {
  const membership = await requireMembership();

  if (!hasRole(membership.role, viewerRoles)) {
    notFound();
  }

  const agent = await prisma.agent.findFirst({
    where: {
      organizationId: membership.organizationId,
      slug: commerceAgentSlug,
    },
    select: {
      apiKeys: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          keyPrefix: true,
          lastUsedAt: true,
          status: true,
        },
        take: 1,
      },
      id: true,
      name: true,
      riskTier: true,
      slug: true,
      status: true,
    },
  });

  if (!agent) {
    return <MissingCommerceAgent />;
  }

  const recentActions = await prisma.actionRequest.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    where: {
      agentId: agent.id,
      organizationId: membership.organizationId,
    },
    select: {
      action: true,
      createdAt: true,
      decision: true,
      id: true,
      metadataJson: true,
      reason: true,
      riskLevel: true,
      riskScore: true,
      status: true,
      tool: true,
    },
  });

  const recentActionIds = recentActions.map((action) => action.id);

  const [pendingApprovals, blockedActions, auditLogs] = await Promise.all([
    prisma.approvalRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      where: {
        actionRequest: {
          agentId: agent.id,
          organizationId: membership.organizationId,
        },
        organizationId: membership.organizationId,
        status: "PENDING",
      },
      select: {
        actionRequest: {
          select: {
            action: true,
            createdAt: true,
            decision: true,
            id: true,
            metadataJson: true,
            reason: true,
            riskLevel: true,
            riskScore: true,
            status: true,
            tool: true,
          },
        },
        createdAt: true,
        id: true,
        status: true,
      },
    }),
    prisma.actionRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      where: {
        agentId: agent.id,
        decision: ActionDecision.BLOCK,
        organizationId: membership.organizationId,
      },
      select: {
        action: true,
        createdAt: true,
        decision: true,
        id: true,
        metadataJson: true,
        reason: true,
        riskLevel: true,
        riskScore: true,
        status: true,
        tool: true,
      },
    }),
    prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      where: {
        organizationId: membership.organizationId,
        OR: [
          {
            actorId: agent.id,
          },
          {
            targetId: {
              in: recentActionIds.length > 0 ? recentActionIds : ["__none__"],
            },
          },
        ],
      },
      select: {
        createdAt: true,
        eventType: true,
        id: true,
        metadataJson: true,
        targetId: true,
        targetType: true,
      },
    }),
  ]);

  const lastActivity = recentActions[0]?.createdAt ?? agent.apiKeys[0]?.lastUsedAt;
  const apiKey = agent.apiKeys[0];

  const actionColumns: DataTableColumn<ActionRow>[] = [
    {
      accessor: (row) => formatDateTime(row.createdAt),
      header: "Timestamp",
    },
    {
      accessor: (row) => formatEnumLabel(row.tool),
      header: "Tool",
    },
    {
      accessor: "action",
      header: "Action",
    },
    {
      accessor: (row) => orderCustomerSummary(row.metadataJson),
      header: "Customer / order",
    },
    {
      accessor: (row) => (
        <span className="flex items-center gap-2">
          <RiskBadge risk={row.riskLevel} />
          <span className="text-xs text-[#687384]">{row.riskScore}</span>
        </span>
      ),
      header: "Risk",
    },
    {
      accessor: (row) => <StatusBadge status={row.decision} />,
      header: "Decision",
    },
    {
      accessor: (row) => <StatusBadge status={row.status} />,
      header: "Status",
    },
    {
      accessor: "reason",
      className: "max-w-xs",
      header: "Reason",
    },
    {
      accessor: (row) => <ActionLink id={row.id} />,
      header: "Action request",
    },
  ];

  const approvalColumns: DataTableColumn<ApprovalRow>[] = [
    {
      accessor: (row) => formatDateTime(row.createdAt),
      header: "Requested",
    },
    {
      accessor: (row) => row.actionRequest.action,
      header: "Action",
    },
    {
      accessor: (row) => orderCustomerSummary(row.actionRequest.metadataJson),
      header: "Order / customer",
    },
    {
      accessor: (row) => (
        <span className="flex items-center gap-2">
          <RiskBadge risk={row.actionRequest.riskLevel} />
          <span className="text-xs text-[#687384]">
            {row.actionRequest.riskScore}
          </span>
        </span>
      ),
      header: "Risk",
    },
    {
      accessor: (row) => <StatusBadge status={row.status} />,
      header: "Approval status",
    },
    {
      accessor: (row) => (
        <Link className="font-semibold text-[#2d6f7f]" href={`/approvals/${row.id}`}>
          Open approval
        </Link>
      ),
      header: "Detail",
    },
  ];

  const blockedColumns: DataTableColumn<ActionRow>[] = [
    {
      accessor: (row) => formatDateTime(row.createdAt),
      header: "Timestamp",
    },
    {
      accessor: "action",
      header: "Action",
    },
    {
      accessor: "reason",
      className: "max-w-sm",
      header: "Reason",
    },
    {
      accessor: (row) => safeMetadataSummary(row.metadataJson),
      className: "max-w-sm",
      header: "Metadata summary",
    },
    {
      accessor: (row) => <ActionLink id={row.id} />,
      header: "Action detail",
    },
  ];

  const auditColumns: DataTableColumn<AuditRow>[] = [
    {
      accessor: (row) => formatDateTime(row.createdAt),
      header: "Timestamp",
    },
    {
      accessor: "eventType",
      header: "Event",
    },
    {
      accessor: (row) => row.targetType ?? "Unknown",
      header: "Target",
    },
    {
      accessor: (row) =>
        row.targetId && recentActionIds.includes(row.targetId) ? (
          <ActionLink id={row.targetId} />
        ) : (
          (row.targetId ?? "n/a")
        ),
      header: "Target ID",
    },
    {
      accessor: (row) => safeMetadataSummary(row.metadataJson),
      className: "max-w-md",
      header: "Metadata",
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <>
            <Button href="/integrations" variant="secondary">
              Back to integrations
            </Button>
            <Button href="/actions" variant="secondary">
              View all actions
            </Button>
            <Button href="/approvals">Open approvals</Button>
          </>
        }
        description="Monitor Northstar Outdoor Supply support-agent activity flowing through the AgentGate gateway."
        eyebrow={membership.organization.slug}
        title="Demo Commerce Monitor"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          detail="Registered gateway agent"
          icon={<Store className="h-5 w-5" aria-hidden />}
          label="Agent"
          value={agent.name}
        />
        <MetricCard
          detail={lastActivity ? formatRelativeTime(lastActivity) : "No activity yet"}
          icon={<RadioTower className="h-5 w-5" aria-hidden />}
          label="Last activity"
          value={lastActivity ? formatDateTime(lastActivity) : "None"}
        />
        <MetricCard
          detail="Full key is never displayed"
          icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
          label="API key prefix"
          value={apiKey?.keyPrefix ?? "Not configured"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
            <div>
              <dt className="text-[#687384]">Agent slug</dt>
              <dd className="mt-1 font-mono text-xs font-semibold">{agent.slug}</dd>
            </div>
            <div>
              <dt className="text-[#687384]">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={agent.status} />
              </dd>
            </div>
            <div>
              <dt className="text-[#687384]">Risk tier</dt>
              <dd className="mt-1">
                <RiskBadge risk={agent.riskTier} />
              </dd>
            </div>
            <div>
              <dt className="text-[#687384]">API key status</dt>
              <dd className="mt-1">
                <StatusBadge status={apiKey?.status ?? "MISSING"} />
              </dd>
            </div>
            <div>
              <dt className="text-[#687384]">Commerce store URL</dt>
              <dd className="mt-1">
                <a className="inline-flex items-center gap-1 text-[#2d6f7f]" href={commerceStoreUrl}>
                  {commerceStoreUrl}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[#687384]">AgentGate URL</dt>
              <dd className="mt-1 font-mono text-xs">{agentGateUrl}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent ecommerce agent actions</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <DataTable
            columns={actionColumns}
            data={recentActions}
            emptyDescription="Run the Northstar chat widget cancellation or receipt scenarios to create commerce action records."
            emptyTitle="No ecommerce agent actions yet"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending approvals from ecommerce agent</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <DataTable
            columns={approvalColumns}
            data={pendingApprovals}
            emptyDescription="High-value Northstar cancellations will appear here when they require reviewer approval."
            emptyTitle="No pending ecommerce approvals"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blocked ecommerce actions</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <DataTable
            columns={blockedColumns}
            data={blockedActions}
            emptyDescription="Ask the Northstar Assistant to delete customer data or cancel a shipped order to see blocks here."
            emptyTitle="No blocked ecommerce actions"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <DataTable
            columns={auditColumns}
            data={auditLogs}
            emptyDescription="Commerce gateway checks, approval requests, and blocked actions will populate this feed."
            emptyTitle="No ecommerce audit logs yet"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm leading-6 text-[#34404a] md:grid-cols-2">
            <li>1. Open the ecommerce store on localhost:3004.</li>
            <li>2. Open Northstar Admin &gt; AgentGate API.</li>
            <li>3. Configure the local-only AgentGate key server-side.</li>
            <li>4. Ask the chat widget to cancel NS-1002.</li>
            <li>5. Watch the approval appear on this monitor.</li>
            <li>6. Ask the chat widget to delete a customer record.</li>
            <li>7. Watch the BLOCK decision appear here.</li>
            <li>8. Open linked action, approval, and audit details inside AgentGate.</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="blue">No paid AI APIs</Badge>
            <Badge tone="blue">No real external actions</Badge>
            <Badge tone="slate">Full API keys hidden</Badge>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

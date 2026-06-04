import {
  AlertTriangle,
  Bot,
  ClipboardCheck,
  FileClock,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  ActionDecision,
  ActionStatus,
  AgentStatus,
  ApprovalStatus,
  RiskLevel,
} from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { JsonViewer } from "@/components/ui/json-viewer";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentOrganizationId, requireMembership } from "@/lib/auth";
import {
  formatDateTime,
  formatEnumLabel,
  formatRelativeTime,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

type RiskDistributionRow = {
  count: number;
  level: RiskLevel;
  percentage: string;
};

type ToolVolumeRow = {
  count: number;
  tool: string;
  percentage: string;
};

type RecentApprovalRow = {
  action: string;
  agent: string;
  createdAt: Date;
  id: string;
  requiredRole: string;
  riskLevel: RiskLevel;
  status: string;
  tool: string;
};

type BlockedActionRow = {
  action: string;
  agent: string;
  createdAt: Date;
  id: string;
  payloadJson: unknown;
  reason: string;
  riskLevel: RiskLevel;
  tool: string;
};

type RiskyAgentRow = {
  actionCount: number;
  id: string;
  maxRiskLevel: RiskLevel | "NONE";
  maxRiskScore: number;
  name: string;
  riskTier: string;
  status: string;
};

type AuditActivityRow = {
  actorType: string;
  createdAt: Date;
  eventType: string;
  id: string;
  metadataJson: unknown;
  targetType: string;
};

function percentage(count: number, total: number) {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((count / total) * 100)}%`;
}

function riskWeight(level: RiskLevel | "NONE") {
  const weights: Record<RiskLevel | "NONE", number> = {
    NONE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  return weights[level];
}

export default async function DashboardPage() {
  const membership = await requireMembership();
  const organizationId = await getCurrentOrganizationId();

  if (!organizationId) {
    return null;
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalAgents,
    activeAgents,
    actionsToday,
    pendingApprovals,
    blockedActions,
    highRiskActions,
    criticalActions,
    riskDistribution,
    toolVolume,
    recentApprovals,
    recentBlockedActions,
    riskyAgents,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.agent.count({ where: { organizationId } }),
    prisma.agent.count({
      where: {
        organizationId,
        status: AgentStatus.ACTIVE,
      },
    }),
    prisma.actionRequest.count({
      where: {
        organizationId,
        createdAt: {
          gte: startOfToday,
        },
      },
    }),
    prisma.approvalRequest.count({
      where: {
        organizationId,
        status: ApprovalStatus.PENDING,
      },
    }),
    prisma.actionRequest.count({
      where: {
        organizationId,
        OR: [{ status: ActionStatus.BLOCKED }, { decision: ActionDecision.BLOCK }],
      },
    }),
    prisma.actionRequest.count({
      where: {
        organizationId,
        riskLevel: RiskLevel.HIGH,
      },
    }),
    prisma.actionRequest.count({
      where: {
        organizationId,
        riskLevel: RiskLevel.CRITICAL,
      },
    }),
    prisma.actionRequest.groupBy({
      by: ["riskLevel"],
      where: { organizationId },
      _count: { id: true },
      orderBy: { riskLevel: "asc" },
    }),
    prisma.actionRequest.groupBy({
      by: ["tool"],
      where: { organizationId },
      _count: { id: true },
      orderBy: { tool: "asc" },
    }),
    prisma.approvalRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        requiredRole: true,
        createdAt: true,
        actionRequest: {
          select: {
            action: true,
            tool: true,
            riskLevel: true,
            agent: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.actionRequest.findMany({
      where: {
        organizationId,
        OR: [{ status: ActionStatus.BLOCKED }, { decision: ActionDecision.BLOCK }],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        action: true,
        tool: true,
        riskLevel: true,
        reason: true,
        payloadJson: true,
        createdAt: true,
        agent: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.agent.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        status: true,
        riskTier: true,
        actionRequests: {
          select: {
            riskLevel: true,
            riskScore: true,
          },
          orderBy: {
            riskScore: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            actionRequests: true,
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        actorType: true,
        eventType: true,
        targetType: true,
        metadataJson: true,
        createdAt: true,
      },
    }),
  ]);

  const totalActionCount = riskDistribution.reduce(
    (total, item) => total + item._count.id,
    0,
  );

  const riskRows: RiskDistributionRow[] = riskDistribution.map((item) => ({
    count: item._count.id,
    level: item.riskLevel,
    percentage: percentage(item._count.id, totalActionCount),
  }));

  const toolTotal = toolVolume.reduce((total, item) => total + item._count.id, 0);

  const toolRows: ToolVolumeRow[] = toolVolume.map((item) => ({
    count: item._count.id,
    tool: item.tool,
    percentage: percentage(item._count.id, toolTotal),
  }));

  const approvalRows: RecentApprovalRow[] = recentApprovals.map((approval) => ({
    action: approval.actionRequest.action,
    agent: approval.actionRequest.agent.name,
    createdAt: approval.createdAt,
    id: approval.id,
    requiredRole: approval.requiredRole
      ? formatEnumLabel(approval.requiredRole)
      : "Any reviewer",
    riskLevel: approval.actionRequest.riskLevel,
    status: approval.status,
    tool: approval.actionRequest.tool,
  }));

  const blockedRows: BlockedActionRow[] = recentBlockedActions.map((action) => ({
    action: action.action,
    agent: action.agent.name,
    createdAt: action.createdAt,
    id: action.id,
    payloadJson: action.payloadJson,
    reason: action.reason,
    riskLevel: action.riskLevel,
    tool: action.tool,
  }));

  const riskyAgentRows: RiskyAgentRow[] = riskyAgents
    .map((agent) => {
      const topAction = agent.actionRequests.at(0);

      return {
        actionCount: agent._count.actionRequests,
        id: agent.id,
        maxRiskLevel: topAction?.riskLevel ?? "NONE",
        maxRiskScore: topAction?.riskScore ?? 0,
        name: agent.name,
        riskTier: agent.riskTier,
        status: agent.status,
      };
    })
    .sort((left, right) => {
      if (right.maxRiskScore !== left.maxRiskScore) {
        return right.maxRiskScore - left.maxRiskScore;
      }

      return riskWeight(right.maxRiskLevel) - riskWeight(left.maxRiskLevel);
    })
    .slice(0, 5);

  const auditRows: AuditActivityRow[] = recentAuditLogs.map((event) => ({
    actorType: event.actorType,
    createdAt: event.createdAt,
    eventType: event.eventType,
    id: event.id,
    metadataJson: event.metadataJson,
    targetType: event.targetType ?? "System",
  }));

  const riskColumns: DataTableColumn<RiskDistributionRow>[] = [
    {
      header: "Risk",
      accessor: (row) => <RiskBadge risk={row.level} />,
    },
    { header: "Actions", accessor: "count" },
    { header: "Share", accessor: "percentage" },
  ];

  const toolColumns: DataTableColumn<ToolVolumeRow>[] = [
    {
      header: "Tool",
      accessor: (row) => formatEnumLabel(row.tool),
    },
    { header: "Actions", accessor: "count" },
    { header: "Share", accessor: "percentage" },
  ];

  const approvalColumns: DataTableColumn<RecentApprovalRow>[] = [
    { header: "Agent", accessor: "agent" },
    {
      header: "Action",
      accessor: (row) => (
        <div>
          <p className="font-medium">{row.action}</p>
          <p className="text-xs text-[#687384]">{formatEnumLabel(row.tool)}</p>
        </div>
      ),
    },
    {
      header: "Risk",
      accessor: (row) => <RiskBadge risk={row.riskLevel} />,
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    { header: "Required role", accessor: "requiredRole" },
    {
      header: "Created",
      accessor: (row) => formatRelativeTime(row.createdAt),
    },
  ];

  const blockedColumns: DataTableColumn<BlockedActionRow>[] = [
    { header: "Agent", accessor: "agent" },
    {
      header: "Action",
      accessor: (row) => (
        <div>
          <p className="font-medium">{row.action}</p>
          <p className="text-xs text-[#687384]">{formatEnumLabel(row.tool)}</p>
        </div>
      ),
    },
    {
      header: "Risk",
      accessor: (row) => <RiskBadge risk={row.riskLevel} />,
    },
    { header: "Reason", accessor: "reason" },
    {
      header: "Payload",
      accessor: (row) => <JsonViewer previewOnly value={row.payloadJson} />,
    },
    {
      header: "Created",
      accessor: (row) => formatRelativeTime(row.createdAt),
    },
  ];

  const riskyAgentColumns: DataTableColumn<RiskyAgentRow>[] = [
    { header: "Agent", accessor: "name" },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Tier",
      accessor: (row) => <RiskBadge risk={row.riskTier} />,
    },
    { header: "Max score", accessor: "maxRiskScore" },
    {
      header: "Max risk",
      accessor: (row) => <RiskBadge risk={row.maxRiskLevel} />,
    },
    { header: "Actions", accessor: "actionCount" },
  ];

  const auditColumns: DataTableColumn<AuditActivityRow>[] = [
    { header: "Event", accessor: "eventType" },
    { header: "Actor", accessor: "actorType" },
    { header: "Target", accessor: "targetType" },
    {
      header: "Details",
      accessor: (row) => <JsonViewer previewOnly value={row.metadataJson} />,
    },
    {
      header: "Time",
      accessor: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description={`Live V1 security posture for ${membership.organization.name}. All metrics are resolved server-side with organizationId=${organizationId}.`}
        eyebrow={membership.organization.slug}
        title="Dashboard"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail="Organization-owned agents"
          icon={<Bot className="h-5 w-5" aria-hidden />}
          label="Total agents"
          value={totalAgents}
        />
        <MetricCard
          detail="Ready to accept gateway checks"
          icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
          label="Active agents"
          value={activeAgents}
        />
        <MetricCard
          detail="Gateway checks since midnight"
          icon={<Zap className="h-5 w-5" aria-hidden />}
          label="Actions today"
          value={actionsToday}
        />
        <MetricCard
          detail="Waiting on reviewer action"
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden />}
          label="Pending approvals"
          value={pendingApprovals}
        />
        <MetricCard
          detail="Blocked by policy or agent state"
          icon={<LockKeyhole className="h-5 w-5" aria-hidden />}
          label="Blocked actions"
          value={blockedActions}
        />
        <MetricCard
          detail="Risk level HIGH"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          label="High-risk actions"
          value={highRiskActions}
        />
        <MetricCard
          detail="Risk level CRITICAL"
          icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
          label="Critical actions"
          value={criticalActions}
        />
        <MetricCard
          detail="Organization kill switch"
          icon={<FileClock className="h-5 w-5" aria-hidden />}
          label="Kill switch status"
          value={<StatusBadge status={membership.organization.killSwitchEnabled} />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk level distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={riskColumns}
              data={riskRows}
              emptyDescription="Gateway checks will appear here once agents begin making requests."
              emptyTitle="No risk data"
              rowKey={(row) => row.level}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action volume by tool</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={toolColumns}
              data={toolRows}
              emptyDescription="Tool volume is calculated from organization-scoped action requests."
              emptyTitle="No tool activity"
              rowKey={(row) => row.tool}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent approvals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={approvalColumns}
            data={approvalRows}
            emptyDescription="Approval requests will appear when policies require human review."
            emptyTitle="No approval requests"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent blocked actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={blockedColumns}
            data={blockedRows}
            emptyDescription="Blocked actions will appear when policies or agent state stop execution."
            emptyTitle="No blocked actions"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top risky agents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={riskyAgentColumns}
              data={riskyAgentRows}
              emptyDescription="Agents with gateway activity will be ranked by highest risk score."
              emptyTitle="No agent risk activity"
              rowKey={(row) => row.id}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent audit activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={auditColumns}
              data={auditRows}
              emptyDescription="Authentication, policy, approval, and gateway events will appear here."
              emptyTitle="No audit activity"
              rowKey={(row) => row.id}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

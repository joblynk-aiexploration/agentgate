import {
  ActionDecision,
  ActionStatus,
  ApprovalStatus,
  RiskLevel,
} from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole, roleRules } from "@/lib/permissions";
import { formatDate, formatEnumLabel, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type DayVolumeRow = {
  count: number;
  day: string;
};

type StatusCountRow = {
  count: number;
  status: string;
};

type RiskCountRow = {
  count: number;
  riskLevel: string;
};

type BlockedRow = {
  action: string;
  agent: string;
  createdAt: Date;
  id: string;
  reason: string;
  riskLevel: string;
  tool: string;
};

type RiskyAgentRow = {
  actionCount: number;
  id: string;
  maxRiskLevel: string;
  maxRiskScore: number;
  name: string;
  riskTier: string;
};

type ToolCountRow = {
  count: number;
  tool: string;
};

function riskWeight(level: string) {
  const weights: Record<string, number> = {
    NONE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  return weights[level] ?? 0;
}

export default async function ReportsPage() {
  const membership = await requireRole(roleRules.viewReports);
  const organizationId = membership.organizationId;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    actions,
    approvalsByStatus,
    riskBreakdown,
    blockedActions,
    riskyAgents,
    toolsByActionCount,
    totalActions,
    totalBlocked,
    totalPendingApprovals,
  ] = await Promise.all([
    prisma.actionRequest.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.approvalRequest.groupBy({
      by: ["status"],
      where: {
        organizationId,
      },
      _count: {
        id: true,
      },
      orderBy: {
        status: "asc",
      },
    }),
    prisma.actionRequest.groupBy({
      by: ["riskLevel"],
      where: {
        organizationId,
      },
      _count: {
        id: true,
      },
      orderBy: {
        riskLevel: "asc",
      },
    }),
    prisma.actionRequest.findMany({
      where: {
        organizationId,
        OR: [{ status: ActionStatus.BLOCKED }, { decision: ActionDecision.BLOCK }],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        action: true,
        tool: true,
        riskLevel: true,
        reason: true,
        createdAt: true,
        agent: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.agent.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        riskTier: true,
        actionRequests: {
          orderBy: {
            riskScore: "desc",
          },
          take: 1,
          select: {
            riskLevel: true,
            riskScore: true,
          },
        },
        _count: {
          select: {
            actionRequests: true,
          },
        },
      },
    }),
    prisma.actionRequest.groupBy({
      by: ["tool"],
      where: {
        organizationId,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 8,
    }),
    prisma.actionRequest.count({
      where: {
        organizationId,
      },
    }),
    prisma.actionRequest.count({
      where: {
        organizationId,
        OR: [{ status: ActionStatus.BLOCKED }, { decision: ActionDecision.BLOCK }],
      },
    }),
    prisma.approvalRequest.count({
      where: {
        organizationId,
        status: ApprovalStatus.PENDING,
      },
    }),
  ]);

  const volumeByDay = new Map<string, number>();
  actions.forEach((action) => {
    const day = formatDate(action.createdAt);
    volumeByDay.set(day, (volumeByDay.get(day) ?? 0) + 1);
  });

  const dayRows: DayVolumeRow[] = Array.from(volumeByDay.entries()).map(
    ([day, count]) => ({ count, day }),
  );
  const approvalRows: StatusCountRow[] = approvalsByStatus.map((item) => ({
    count: item._count.id,
    status: item.status,
  }));
  const riskRows: RiskCountRow[] = riskBreakdown.map((item) => ({
    count: item._count.id,
    riskLevel: item.riskLevel,
  }));
  const blockedRows: BlockedRow[] = blockedActions.map((action) => ({
    action: action.action,
    agent: action.agent.name,
    createdAt: action.createdAt,
    id: action.id,
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
        maxRiskLevel: topAction?.riskLevel ?? RiskLevel.NONE,
        maxRiskScore: topAction?.riskScore ?? 0,
        name: agent.name,
        riskTier: agent.riskTier,
      };
    })
    .sort((left, right) => {
      if (right.maxRiskScore !== left.maxRiskScore) {
        return right.maxRiskScore - left.maxRiskScore;
      }

      return riskWeight(right.maxRiskLevel) - riskWeight(left.maxRiskLevel);
    })
    .slice(0, 8);
  const toolRows: ToolCountRow[] = toolsByActionCount.map((item) => ({
    count: item._count.id,
    tool: item.tool,
  }));

  const dayColumns: DataTableColumn<DayVolumeRow>[] = [
    { header: "Day", accessor: "day" },
    { header: "Actions", accessor: "count" },
  ];
  const approvalColumns: DataTableColumn<StatusCountRow>[] = [
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    { header: "Approvals", accessor: "count" },
  ];
  const riskColumns: DataTableColumn<RiskCountRow>[] = [
    {
      header: "Risk",
      accessor: (row) => <RiskBadge risk={row.riskLevel} />,
    },
    { header: "Actions", accessor: "count" },
  ];
  const blockedColumns: DataTableColumn<BlockedRow>[] = [
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
      header: "Time",
      accessor: (row) => formatRelativeTime(row.createdAt),
    },
  ];
  const riskyAgentColumns: DataTableColumn<RiskyAgentRow>[] = [
    { header: "Agent", accessor: "name" },
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
  const toolColumns: DataTableColumn<ToolCountRow>[] = [
    {
      header: "Tool",
      accessor: (row) => formatEnumLabel(row.tool),
    },
    { header: "Actions", accessor: "count" },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/api/audit-logs/export" variant="secondary">
            Audit export
          </Button>
        }
        description="Organization-scoped operational reporting for V1 gateway activity, approvals, risk, and audit posture."
        eyebrow={membership.organization.slug}
        title="Reports"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total actions" value={totalActions} detail="All gateway checks" />
        <MetricCard label="Blocked actions" value={totalBlocked} detail="Policy or kill-switch stops" />
        <MetricCard label="Pending approvals" value={totalPendingApprovals} detail="Awaiting reviewer action" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Action volume by day</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={dayColumns}
              data={dayRows}
              emptyDescription="Recent gateway checks will be grouped by day."
              emptyTitle="No recent action volume"
              rowKey={(row) => row.day}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approvals by status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={approvalColumns}
              data={approvalRows}
              emptyDescription="Approval status totals will appear here."
              emptyTitle="No approvals"
              rowKey={(row) => row.status}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={riskColumns}
              data={riskRows}
              emptyDescription="Risk totals are calculated from action requests."
              emptyTitle="No risk data"
              rowKey={(row) => row.riskLevel}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top tools by action count</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={toolColumns}
              data={toolRows}
              emptyDescription="Tool usage appears after gateway checks."
              emptyTitle="No tool usage"
              rowKey={(row) => row.tool}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blocked actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={blockedColumns}
            data={blockedRows}
            emptyDescription="Blocked requests appear when policy, agent state, or kill switch stops an action."
            emptyTitle="No blocked actions"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top risky agents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={riskyAgentColumns}
            data={riskyAgentRows}
            emptyDescription="Agents are ranked by highest observed risk score."
            emptyTitle="No risky agents"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

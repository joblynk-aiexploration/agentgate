import Link from "next/link";
import {
  ActionDecision,
  ActionStatus,
  RiskLevel,
  ToolType,
} from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildActionWhere, requireActionViewer } from "@/lib/actions";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { actionListQuerySchema } from "@/lib/validators";

type ActionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ActionRow = {
  action: string;
  agent: string;
  createdAt: Date;
  decision: string;
  environment: string;
  id: string;
  reason: string;
  requiresApproval: boolean;
  riskLevel: string;
  riskScore: number;
  status: string;
  tool: string;
};

function getSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export default async function ActionsPage({ searchParams }: ActionsPageProps) {
  const membership = await requireActionViewer();
  const params = await searchParams;
  const parsedFilters = actionListQuerySchema.safeParse({
    status: getSearchValue(params, "status") || undefined,
    decision: getSearchValue(params, "decision") || undefined,
    riskLevel: getSearchValue(params, "riskLevel") || undefined,
    tool: getSearchValue(params, "tool") || undefined,
    agentId: getSearchValue(params, "agentId") || undefined,
    from: getSearchValue(params, "from") || undefined,
    to: getSearchValue(params, "to") || undefined,
    environment: getSearchValue(params, "environment") || undefined,
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : actionListQuerySchema.parse({});

  const [actions, agents, filterSource] = await Promise.all([
    prisma.actionRequest.findMany({
      where: buildActionWhere(membership.organizationId, filters),
      orderBy: {
        createdAt: "desc",
      },
      take: 250,
      select: {
        id: true,
        action: true,
        createdAt: true,
        decision: true,
        environment: true,
        reason: true,
        requiresApproval: true,
        riskLevel: true,
        riskScore: true,
        status: true,
        tool: true,
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.agent.findMany({
      where: {
        organizationId: membership.organizationId,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.actionRequest.findMany({
      where: {
        organizationId: membership.organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1000,
      select: {
        environment: true,
      },
    }),
  ]);

  const rows: ActionRow[] = actions.map((action) => ({
    action: action.action,
    agent: action.agent.name,
    createdAt: action.createdAt,
    decision: action.decision,
    environment: action.environment,
    id: action.id,
    reason: action.reason,
    requiresApproval: action.requiresApproval,
    riskLevel: action.riskLevel,
    riskScore: action.riskScore,
    status: action.status,
    tool: action.tool,
  }));
  const environments = uniqueValues(filterSource.map((action) => action.environment));

  const columns: DataTableColumn<ActionRow>[] = [
    {
      header: "Timestamp",
      accessor: (row) => formatDateTime(row.createdAt),
    },
    {
      header: "Agent",
      accessor: (row) => (
        <Link
          className="font-semibold text-[#172326] hover:text-[#2d6f7f]"
          href={`/actions/${row.id}`}
        >
          {row.agent}
        </Link>
      ),
    },
    {
      header: "Tool",
      accessor: (row) => formatEnumLabel(row.tool),
    },
    { header: "Action", accessor: "action" },
    { header: "Environment", accessor: "environment" },
    {
      header: "Risk",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <RiskBadge risk={row.riskLevel} />
          <span className="text-xs font-semibold text-[#687384]">{row.riskScore}</span>
        </div>
      ),
    },
    {
      header: "Decision",
      accessor: (row) => <StatusBadge status={row.decision} />,
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Requires approval",
      accessor: (row) => <StatusBadge status={row.requiresApproval} />,
    },
    { header: "Reason", accessor: "reason" },
    {
      header: "Actions",
      accessor: (row) => (
        <Button className="h-8" href={`/actions/${row.id}`} variant="secondary">
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Inspect every organization-scoped AI action request, decision, risk assessment, approval state, and audit trail without replaying execution."
        eyebrow={membership.organization.slug}
        title="Actions"
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-8" method="GET">
            <label className="grid gap-2 text-sm font-medium">
              Status
              <Select defaultValue={filters.status ?? ""} name="status">
                <option value="">Any status</option>
                {Object.values(ActionStatus).map((status) => (
                  <option key={status} value={status}>
                    {formatEnumLabel(status)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Decision
              <Select defaultValue={filters.decision ?? ""} name="decision">
                <option value="">Any decision</option>
                {Object.values(ActionDecision).map((decision) => (
                  <option key={decision} value={decision}>
                    {formatEnumLabel(decision)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Risk
              <Select defaultValue={filters.riskLevel ?? ""} name="riskLevel">
                <option value="">Any risk</option>
                {Object.values(RiskLevel).map((level) => (
                  <option key={level} value={level}>
                    {formatEnumLabel(level)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Tool
              <Select defaultValue={filters.tool ?? ""} name="tool">
                <option value="">Any tool</option>
                {Object.values(ToolType).map((tool) => (
                  <option key={tool} value={tool}>
                    {formatEnumLabel(tool)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Agent
              <Select defaultValue={filters.agentId ?? ""} name="agentId">
                <option value="">Any agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Environment
              <Select defaultValue={filters.environment ?? ""} name="environment">
                <option value="">Any environment</option>
                {environments.map((environment) => (
                  <option key={environment} value={environment}>
                    {environment}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              From
              <Input defaultValue={filters.from ?? ""} name="from" type="date" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              To
              <Input defaultValue={filters.to ?? ""} name="to" type="date" />
            </label>
            <div className="flex gap-2 lg:col-span-8">
              <Button type="submit">Apply filters</Button>
              <Button href="/actions" variant="secondary">
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Action requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="Gateway checks for this organization will appear here."
            emptyTitle="No actions match"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

import Link from "next/link";
import {
  ApprovalStatus,
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
import { buildApprovalWhere, requireApprovalViewer } from "@/lib/approvals";
import { formatEnumLabel, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { approvalListQuerySchema } from "@/lib/validators";

type ApprovalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ApprovalRow = {
  action: string;
  agent: string;
  id: string;
  reason: string;
  requestedAt: Date;
  requiredRole: string;
  riskLevel: string;
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

export default async function ApprovalsPage({
  searchParams,
}: ApprovalsPageProps) {
  const membership = await requireApprovalViewer();
  const params = await searchParams;
  const parsedFilters = approvalListQuerySchema.safeParse({
    status: getSearchValue(params, "status") || undefined,
    riskLevel: getSearchValue(params, "riskLevel") || undefined,
    tool: getSearchValue(params, "tool") || undefined,
    agentId: getSearchValue(params, "agentId") || undefined,
    date: getSearchValue(params, "date") || undefined,
    assignedToMe: getSearchValue(params, "assignedToMe") || undefined,
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : approvalListQuerySchema.parse({});

  const [approvals, agents] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: buildApprovalWhere(
        membership.organizationId,
        membership.userId,
        filters,
      ),
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      include: {
        actionRequest: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
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
  ]);

  const rows: ApprovalRow[] = approvals.map((approval) => ({
    action: approval.actionRequest.action,
    agent: approval.actionRequest.agent.name,
    id: approval.id,
    reason: approval.actionRequest.reason,
    requestedAt: approval.createdAt,
    requiredRole: approval.requiredRole
      ? formatEnumLabel(approval.requiredRole)
      : "Any reviewer",
    riskLevel: approval.actionRequest.riskLevel,
    status: approval.status,
    tool: approval.actionRequest.tool,
  }));

  const columns: DataTableColumn<ApprovalRow>[] = [
    {
      header: "Requested time",
      accessor: (row) => formatRelativeTime(row.requestedAt),
    },
    {
      header: "Agent",
      accessor: (row) => (
        <Link
          className="font-semibold text-[#172326] hover:text-[#2d6f7f]"
          href={`/approvals/${row.id}`}
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
    {
      header: "Risk",
      accessor: (row) => <RiskBadge risk={row.riskLevel} />,
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    { header: "Required role", accessor: "requiredRole" },
    { header: "Reason", accessor: "reason" },
    {
      header: "Actions",
      accessor: (row) => (
        <Button className="h-8" href={`/approvals/${row.id}`} variant="secondary">
          Review
        </Button>
      ),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Review gateway actions that require human approval before simulated execution."
        eyebrow={membership.organization.slug}
        title="Approval Inbox"
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-6" method="GET">
            <label className="grid gap-2 text-sm font-medium">
              Status
              <Select defaultValue={filters.status ?? ""} name="status">
                <option value="">Any status</option>
                {Object.values(ApprovalStatus).map((status) => (
                  <option key={status} value={status}>
                    {formatEnumLabel(status)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Risk level
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
              Date
              <Input defaultValue={filters.date ?? ""} name="date" type="date" />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium">
              <input
                defaultChecked={filters.assignedToMe}
                name="assignedToMe"
                type="checkbox"
                value="true"
              />
              Assigned to me
            </label>
            <div className="flex gap-2 lg:col-span-6">
              <Button type="submit">Apply filters</Button>
              <Button href="/approvals" variant="secondary">
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="Approval requests generated by gateway policy decisions will appear here."
            emptyTitle="No approvals match"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

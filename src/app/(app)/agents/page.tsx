import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Pause, Play, Plus } from "lucide-react";
import { AgentRiskTier, AgentStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canManageAgents,
  normalizeAllowedTools,
  pauseAgent,
  requireAgentManager,
  requireAgentViewer,
  resumeAgent,
} from "@/lib/agents";
import { formatEnumLabel, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type AgentRow = {
  actionsToday: number;
  allowedTools: string[];
  department: string;
  id: string;
  lastActivityAt: Date | null;
  name: string;
  owner: string;
  riskTier: string;
  status: string;
};

function parseAgentStatus(value: string) {
  return Object.values(AgentStatus).includes(value as AgentStatus)
    ? (value as AgentStatus)
    : undefined;
}

function parseAgentRiskTier(value: string) {
  return Object.values(AgentRiskTier).includes(value as AgentRiskTier)
    ? (value as AgentRiskTier)
    : undefined;
}

async function pauseAction(formData: FormData) {
  "use server";

  const membership = await requireAgentManager();
  const agentId = String(formData.get("agentId") ?? "");

  await pauseAgent(membership, agentId);
  revalidatePath("/agents");
}

async function resumeAction(formData: FormData) {
  "use server";

  const membership = await requireAgentManager();
  const agentId = String(formData.get("agentId") ?? "");

  await resumeAgent(membership, agentId);
  revalidatePath("/agents");
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const membership = await requireAgentViewer();
  const params = await searchParams;
  const canManage = canManageAgents(membership.role);
  const organizationId = membership.organizationId;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = parseAgentStatus(typeof params.status === "string" ? params.status : "");
  const riskTier = parseAgentRiskTier(
    typeof params.riskTier === "string" ? params.riskTier : "",
  );
  const tool = typeof params.tool === "string" ? params.tool : "";

  const [agents, actionCounts] = await Promise.all([
    prisma.agent.findMany({
      where: {
        organizationId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { department: { contains: query, mode: "insensitive" } },
                { slug: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(riskTier ? { riskTier } : {}),
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        department: true,
        status: true,
        riskTier: true,
        allowedToolsJson: true,
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        actionRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    prisma.actionRequest.groupBy({
      by: ["agentId"],
      where: {
        organizationId,
        createdAt: { gte: startOfToday },
      },
      _count: { id: true },
    }),
  ]);

  const actionCountByAgent = new Map(
    actionCounts.map((count) => [count.agentId, count._count.id]),
  );

  const rows: AgentRow[] = agents
    .map((agent) => ({
      actionsToday: actionCountByAgent.get(agent.id) ?? 0,
      allowedTools: normalizeAllowedTools(agent.allowedToolsJson),
      department: agent.department ?? "Unassigned",
      id: agent.id,
      lastActivityAt: agent.actionRequests.at(0)?.createdAt ?? null,
      name: agent.name,
      owner: agent.owner?.name ?? agent.owner?.email ?? "Unassigned",
      riskTier: agent.riskTier,
      status: agent.status,
    }))
    .filter((agent) =>
      tool
        ? agent.allowedTools.some((allowedTool) =>
            allowedTool.toLowerCase().includes(tool.toLowerCase()),
          )
        : true,
    );

  const columns: DataTableColumn<AgentRow>[] = [
    {
      header: "Name",
      accessor: (row) => (
        <Link className="font-semibold text-[#172326] hover:text-[#2d6f7f]" href={`/agents/${row.id}`}>
          {row.name}
        </Link>
      ),
    },
    { header: "Department", accessor: "department" },
    { header: "Owner", accessor: "owner" },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Risk tier",
      accessor: (row) => <RiskBadge risk={row.riskTier} />,
    },
    {
      header: "Allowed tools",
      accessor: (row) => (
        <span className="text-sm text-[#5c6470]">
          {row.allowedTools.map(formatEnumLabel).join(", ")}
        </span>
      ),
    },
    { header: "Actions today", accessor: "actionsToday" },
    {
      header: "Last activity",
      accessor: (row) => formatRelativeTime(row.lastActivityAt),
    },
    {
      header: "Action",
      accessor: (row) =>
        canManage ? (
          row.status === AgentStatus.PAUSED ? (
            <form action={resumeAction}>
              <input name="agentId" type="hidden" value={row.id} />
              <Button className="h-8" type="submit" variant="secondary">
                <Play className="h-3.5 w-3.5" aria-hidden />
                Resume
              </Button>
            </form>
          ) : (
            <form action={pauseAction}>
              <input name="agentId" type="hidden" value={row.id} />
              <Button className="h-8" type="submit" variant="secondary">
                <Pause className="h-3.5 w-3.5" aria-hidden />
                Pause
              </Button>
            </form>
          )
        ) : (
          <span className="text-sm text-[#687384]">View only</span>
        ),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          canManage ? (
            <Button href="/agents/new">
              <Plus className="h-4 w-4" aria-hidden />
              New agent
            </Button>
          ) : null
        }
        description="Register, inspect, and control AI agents scoped to the current organization."
        eyebrow={membership.organization.slug}
        title="Agent Registry"
      />

      <FilterBar title="Agent filters">
        <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" method="GET">
          <label className="grid gap-2 text-sm font-medium">
            Search
            <Input name="q" placeholder="Agent, slug, or department" defaultValue={query} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Status
            <Select name="status" defaultValue={status ?? ""}>
              <option value="">Any status</option>
              {Object.values(AgentStatus).map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Risk tier
            <Select name="riskTier" defaultValue={riskTier ?? ""}>
              <option value="">Any tier</option>
              {Object.values(AgentRiskTier).map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Tool
            <Input name="tool" placeholder="stripe, email, demo" defaultValue={tool} />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            <Button href="/agents" variant="secondary">
              Reset
            </Button>
          </div>
        </form>
      </FilterBar>

      <Card>
        <CardHeader>
          <CardTitle>Registered agents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="Create your first agent to start routing gateway checks through AgentGate."
            emptyTitle="No agents registered"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

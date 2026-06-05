import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Pause, Play, Trash2 } from "lucide-react";
import { AgentRiskTier, AgentStatus, ToolType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { JsonViewer } from "@/components/ui/json-viewer";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import {
  canManageAgents,
  deleteAgent,
  normalizeAllowedTools,
  pauseAgent,
  requireAgentManager,
  requireAgentViewer,
  resumeAgent,
  updateAgent,
} from "@/lib/agents";
import {
  formatDateTime,
  formatEnumLabel,
  formatRelativeTime,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { parseAgentFormData } from "@/lib/validators";

type AgentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ApiKeyRow = {
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  name: string;
  status: string;
};

type ActionRow = {
  action: string;
  createdAt: Date;
  decision: string;
  id: string;
  payloadJson: unknown;
  reason: string;
  riskLevel: string;
  status: string;
  tool: string;
};

type PolicyRow = {
  action: string;
  decision: string;
  id: string;
  name: string;
  priority: number;
  status: string;
  tool: string;
};

async function updateAgentAction(agentId: string, formData: FormData) {
  "use server";

  const membership = await requireAgentManager();
  const input = parseAgentFormData(formData);

  await updateAgent(membership, agentId, input);
  revalidatePath(`/agents/${agentId}`);
  redirect(`/agents/${agentId}`);
}

async function pauseAction(agentId: string) {
  "use server";

  const membership = await requireAgentManager();

  await pauseAgent(membership, agentId);
  redirect(`/agents/${agentId}`);
}

async function resumeAction(agentId: string) {
  "use server";

  const membership = await requireAgentManager();

  await resumeAgent(membership, agentId);
  redirect(`/agents/${agentId}`);
}

async function deleteAgentAction(agentId: string) {
  "use server";

  const membership = await requireAgentManager();

  await deleteAgent(membership, agentId);
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params;
  const membership = await requireAgentViewer();
  const canManage = canManageAgents(membership.role);
  const organizationId = membership.organizationId;

  const agent = await prisma.agent.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      apiKeys: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          status: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      actionRequests: {
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          tool: true,
          action: true,
          status: true,
          decision: true,
          riskLevel: true,
          reason: true,
          payloadJson: true,
          createdAt: true,
        },
      },
    },
  });

  if (!agent) {
    redirect("/agents");
  }

  const allowedTools = normalizeAllowedTools(agent.allowedToolsJson);
  const owners = await prisma.membership.findMany({
    where: { organizationId },
    orderBy: {
      user: {
        email: "asc",
      },
    },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  const policies = await prisma.policy.findMany({
    where: {
      organizationId,
      rules: {
        some: {
          OR: [{ tool: { in: allowedTools } }, { tool: null }],
        },
      },
    },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      status: true,
      priority: true,
      rules: {
        where: {
          OR: [{ tool: { in: allowedTools } }, { tool: null }],
        },
        select: {
          id: true,
          tool: true,
          action: true,
          decision: true,
        },
      },
    },
  });

  const apiKeyRows: ApiKeyRow[] = agent.apiKeys.map((apiKey) => ({
    createdAt: apiKey.createdAt,
    expiresAt: apiKey.expiresAt,
    id: apiKey.id,
    keyPrefix: apiKey.keyPrefix,
    lastUsedAt: apiKey.lastUsedAt,
    name: apiKey.name,
    status: apiKey.status,
  }));

  const actionRows: ActionRow[] = agent.actionRequests.map((action) => ({
    action: action.action,
    createdAt: action.createdAt,
    decision: action.decision,
    id: action.id,
    payloadJson: action.payloadJson,
    reason: action.reason,
    riskLevel: action.riskLevel,
    status: action.status,
    tool: action.tool,
  }));

  const policyRows: PolicyRow[] = policies.flatMap((policy) =>
    policy.rules.map((rule) => ({
      action: rule.action ?? "Any action",
      decision: rule.decision,
      id: rule.id,
      name: policy.name,
      priority: policy.priority,
      status: policy.status,
      tool: rule.tool ?? "Any tool",
    })),
  );

  const apiKeyColumns: DataTableColumn<ApiKeyRow>[] = [
    { header: "Name", accessor: "name" },
    { header: "Prefix", accessor: "keyPrefix" },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Last used",
      accessor: (row) => formatRelativeTime(row.lastUsedAt),
    },
    {
      header: "Expires",
      accessor: (row) => formatDateTime(row.expiresAt),
    },
    {
      header: "Created",
      accessor: (row) => formatDateTime(row.createdAt),
    },
  ];

  const actionColumns: DataTableColumn<ActionRow>[] = [
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
      header: "Decision",
      accessor: (row) => <StatusBadge status={row.decision} />,
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
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

  const policyColumns: DataTableColumn<PolicyRow>[] = [
    { header: "Policy", accessor: "name" },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    { header: "Priority", accessor: "priority" },
    {
      header: "Tool",
      accessor: (row) => formatEnumLabel(row.tool),
    },
    { header: "Action", accessor: "action" },
    {
      header: "Decision",
      accessor: (row) => <StatusBadge status={row.decision} />,
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              agent.status === AgentStatus.PAUSED ? (
                <form action={resumeAction.bind(null, agent.id)}>
                  <Button type="submit" variant="secondary">
                    <Play className="h-4 w-4" aria-hidden />
                    Resume
                  </Button>
                </form>
              ) : (
                <form action={pauseAction.bind(null, agent.id)}>
                  <Button type="submit" variant="secondary">
                    <Pause className="h-4 w-4" aria-hidden />
                    Pause
                  </Button>
                </form>
              )
            ) : null}
            <Button href="/agents" variant="secondary">
              Back to agents
            </Button>
          </div>
        }
        description={agent.description ?? "No description provided."}
        eyebrow={membership.organization.slug}
        title={agent.name}
      />

      <Card>
        <CardContent className="grid gap-2 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[#172326]">Gateway behavior</p>
            <p className="mt-1 text-sm leading-6 text-[#5c6470]">
              Active agents can submit checks with scoped API keys. Paused agents
              force the gateway to return BLOCK before simulated execution.
            </p>
          </div>
          <StatusBadge status={agent.status} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Status</p>
            <div className="mt-3">
              <StatusBadge status={agent.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Risk tier</p>
            <div className="mt-3">
              <RiskBadge risk={agent.riskTier} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Owner</p>
            <p className="mt-3 font-semibold">
              {agent.owner?.name ?? agent.owner?.email ?? "Unassigned"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Department</p>
            <p className="mt-3 font-semibold">{agent.department ?? "Unassigned"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{canManage ? "Edit agent" : "Agent profile"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAgentAction.bind(null, agent.id)} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Name
                <Input
                  defaultValue={agent.name}
                  disabled={!canManage}
                  name="name"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <Input
                  defaultValue={agent.slug}
                  disabled={!canManage}
                  name="slug"
                  required
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Description
              <Textarea
                defaultValue={agent.description ?? ""}
                disabled={!canManage}
                name="description"
              />
            </label>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Department
                <Input
                  defaultValue={agent.department ?? ""}
                  disabled={!canManage}
                  name="department"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Owner
                <Select
                  defaultValue={agent.owner?.id ?? ""}
                  disabled={!canManage}
                  name="ownerUserId"
                >
                  <option value="">Unassigned</option>
                  {owners.map(({ user }) => (
                    <option key={user.id} value={user.id}>
                      {user.name ?? user.email}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Risk tier
                <Select
                  defaultValue={agent.riskTier}
                  disabled={!canManage}
                  name="riskTier"
                  required
                >
                  {Object.values(AgentRiskTier).map((tier) => (
                    <option key={tier} value={tier}>
                      {formatEnumLabel(tier)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Status
                <Select
                  defaultValue={agent.status}
                  disabled={!canManage}
                  name="status"
                  required
                >
                  {Object.values(AgentStatus).map((status) => (
                    <option key={status} value={status}>
                      {formatEnumLabel(status)}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <fieldset className="grid gap-3" disabled={!canManage}>
              <legend className="text-sm font-semibold">Allowed tools</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(ToolType).map((tool) => (
                  <label
                    className="flex items-center gap-2 border border-[#d9dee8] bg-[#f8fafc] px-3 py-2 text-sm"
                    key={tool}
                  >
                    <input
                      defaultChecked={allowedTools.includes(tool)}
                      name="allowedTools"
                      type="checkbox"
                      value={tool}
                    />
                    {formatEnumLabel(tool)}
                  </label>
                ))}
              </div>
            </fieldset>

            {canManage ? (
              <div className="flex justify-end border-t border-[#e5e9ef] pt-5">
                <Button type="submit">Save changes</Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API keys linked to this agent</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={apiKeyColumns}
            data={apiKeyRows}
            emptyDescription="Developer-owned API keys for this agent will appear here."
            emptyTitle="No API keys linked"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={actionColumns}
            data={actionRows}
            emptyDescription="Gateway checks from this agent will appear here."
            emptyTitle="No recent actions"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policies affecting this agent</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={policyColumns}
            data={policyRows}
            emptyDescription="Policies with matching allowed tools or global rules will appear here."
            emptyTitle="No matching policies"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      {canManage ? (
        <Card className="border-[#e6c6b7]">
          <CardHeader className="border-[#e6c6b7]">
            <CardTitle>Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-[#5c6470]">
              Deleting an agent removes the registry profile and cascades related
              action request records according to the database schema. API keys are
              detached rather than exposed.
            </p>
            <form action={deleteAgentAction.bind(null, agent.id)} className="mt-4">
              <Button type="submit" variant="danger">
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete agent
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

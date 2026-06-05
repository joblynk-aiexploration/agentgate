import { notFound } from "next/navigation";
import { WebhookEndpointStatus } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canDisableWebhooks,
  canManageWebhooks,
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookViewerMembership,
  listWebhookEndpoints,
  testWebhookEndpoint,
  updateWebhookEndpoint,
} from "@/lib/webhooks";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import {
  outboundWebhookEventValues,
  webhookEndpointInputSchema,
} from "@/lib/validators";

type WebhookRow = {
  createdAt: Date;
  events: string[];
  hasSecret: boolean;
  id: string;
  name: string;
  status: string;
  updatedAt: Date;
  url: string;
};

async function createWebhookAction(formData: FormData) {
  "use server";

  const membership = await getWebhookViewerMembership();

  if (!membership || !canManageWebhooks(membership.role)) {
    notFound();
  }

  const input = webhookEndpointInputSchema.parse({
    name: formData.get("name"),
    url: formData.get("url"),
    secret: formData.get("secret") || null,
    status: WebhookEndpointStatus.ACTIVE,
    events: formData.getAll("events"),
  });

  await createWebhookEndpoint(membership, input);
}

async function disableWebhookAction(formData: FormData) {
  "use server";

  const membership = await getWebhookViewerMembership();

  if (!membership || !canDisableWebhooks(membership.role)) {
    notFound();
  }

  await updateWebhookEndpoint(membership, String(formData.get("webhookId") ?? ""), {
    status: WebhookEndpointStatus.DISABLED,
  });
}

async function deleteWebhookAction(formData: FormData) {
  "use server";

  const membership = await getWebhookViewerMembership();

  if (!membership || !canManageWebhooks(membership.role)) {
    notFound();
  }

  await deleteWebhookEndpoint(membership, String(formData.get("webhookId") ?? ""));
}

async function testWebhookAction(formData: FormData) {
  "use server";

  const membership = await getWebhookViewerMembership();

  if (!membership || !canManageWebhooks(membership.role)) {
    notFound();
  }

  await testWebhookEndpoint(membership, String(formData.get("webhookId") ?? ""));
}

function parseEvents(value: unknown) {
  return Array.isArray(value)
    ? value.filter((event): event is string => typeof event === "string")
    : [];
}

export default async function DeveloperWebhooksPage() {
  const membership = await getWebhookViewerMembership();

  if (!membership) {
    notFound();
  }

  const endpoints = await listWebhookEndpoints(membership);
  const canManage = canManageWebhooks(membership.role);
  const canDisable = canDisableWebhooks(membership.role);

  const rows: WebhookRow[] = endpoints.map((endpoint) => ({
    createdAt: endpoint.createdAt,
    events: parseEvents(endpoint.eventsJson),
    hasSecret: Boolean(endpoint.secretHash),
    id: endpoint.id,
    name: endpoint.name,
    status: endpoint.status,
    updatedAt: endpoint.updatedAt,
    url: endpoint.url,
  }));

  const columns: DataTableColumn<WebhookRow>[] = [
    {
      header: "Endpoint",
      accessor: (row) => (
        <div>
          <p className="font-semibold">{row.name}</p>
          <p className="mt-1 max-w-md truncate text-xs text-[#687384]">{row.url}</p>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Events",
      accessor: (row) => (
        <div className="flex max-w-md flex-wrap gap-1">
          {row.events.slice(0, 4).map((event) => (
            <Badge key={event}>{formatEnumLabel(event)}</Badge>
          ))}
          {row.events.length > 4 ? <Badge>+{row.events.length - 4}</Badge> : null}
        </div>
      ),
    },
    {
      header: "Secret",
      accessor: (row) => (
        <Badge tone={row.hasSecret ? "green" : "slate"}>
          {row.hasSecret ? "Signed" : "Unsigned"}
        </Badge>
      ),
    },
    {
      header: "Updated",
      accessor: (row) => formatDateTime(row.updatedAt),
    },
    {
      header: "Actions",
      accessor: (row) => (
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <form action={testWebhookAction}>
              <input name="webhookId" type="hidden" value={row.id} />
              <Button className="h-8" type="submit" variant="secondary">
                Test
              </Button>
            </form>
          ) : null}
          {canDisable && row.status === WebhookEndpointStatus.ACTIVE ? (
            <form action={disableWebhookAction}>
              <input name="webhookId" type="hidden" value={row.id} />
              <Button className="h-8" type="submit" variant="secondary">
                Disable
              </Button>
            </form>
          ) : null}
          {canManage ? (
            <form action={deleteWebhookAction}>
              <input name="webhookId" type="hidden" value={row.id} />
              <Button className="h-8" type="submit" variant="danger">
                Delete
              </Button>
            </form>
          ) : null}
          {!canManage && !canDisable ? (
            <span className="text-sm text-[#687384]">View only</span>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/developer" variant="secondary">
            Developer home
          </Button>
        }
        description="Configure safe V1 outbound webhook callback endpoints for gateway decisions, approvals, blocks, executions, and kill-switch events."
        eyebrow={membership.organization.slug}
        title="Outbound Webhooks"
      />

      <Card>
        <CardHeader>
          <CardTitle>Create webhook endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createWebhookAction} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Name
                <Input
                  disabled={!canManage}
                  name="name"
                  placeholder="Approval callbacks"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                URL
                <Input
                  disabled={!canManage}
                  name="url"
                  placeholder="https://example.com/agentgate/webhook"
                  required
                  type="url"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Signing secret optional
              <Input
                disabled={!canManage}
                name="secret"
                placeholder="At least 12 characters"
                type="password"
              />
            </label>
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold">Subscribed events</legend>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {outboundWebhookEventValues.map((event) => (
                  <label
                    className="flex items-center gap-2 border border-[#d9dee8] bg-[#f8fafc] px-3 py-2 text-sm"
                    key={event}
                  >
                    <input
                      defaultChecked={[
                        "approval.requested",
                        "approval.approved",
                        "approval.rejected",
                        "action.blocked",
                      ].includes(event)}
                      disabled={!canManage}
                      name="events"
                      type="checkbox"
                      value={event}
                    />
                    {formatEnumLabel(event)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="border border-[#d9dee8] bg-[#f8fafc] p-4 text-sm leading-6 text-[#34404a]">
              V1 stores endpoint configuration and simulates test deliveries by default.
              Real outbound delivery is disabled unless a future deployment explicitly
              opts in with a safe timeout.
            </div>
            {canManage ? (
              <div className="flex justify-end border-t border-[#e5e9ef] pt-5">
                <Button type="submit">Create webhook</Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured endpoints</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="Create a demo-safe webhook endpoint to receive signed AgentGate event payloads."
            emptyTitle="No webhooks configured"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

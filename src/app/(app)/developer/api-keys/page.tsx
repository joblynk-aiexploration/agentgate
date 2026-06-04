import { notFound } from "next/navigation";
import { ApiKeyStatus } from "@/generated/prisma/client";
import {
  ApiKeyCreateForm,
  type CreateApiKeyState,
} from "@/app/(app)/developer/api-keys/_components/api-key-create-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canCreateApiKeys,
  canRevokeApiKeys,
  createApiKey,
  getApiKeyViewerMembership,
  revokeApiKey,
} from "@/lib/api-keys";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { parseApiKeyFormData } from "@/lib/validators";

type ApiKeyRow = {
  agentScope: string;
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  name: string;
  status: string;
};

async function createKeyAction(
  _state: CreateApiKeyState,
  formData: FormData,
): Promise<CreateApiKeyState> {
  "use server";

  const membership = await getApiKeyViewerMembership();

  if (!membership || !canCreateApiKeys(membership.role)) {
    return {
      error: "You do not have permission to create API keys.",
      fullKey: null,
      keyPrefix: null,
    };
  }

  try {
    const input = parseApiKeyFormData(formData);
    const result = await createApiKey(membership, input);

    return {
      error: null,
      fullKey: result.fullKey,
      keyPrefix: result.apiKey.keyPrefix,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "API key creation failed.",
      fullKey: null,
      keyPrefix: null,
    };
  }
}

async function revokeKeyAction(formData: FormData) {
  "use server";

  const membership = await getApiKeyViewerMembership();

  if (!membership || !canRevokeApiKeys(membership.role)) {
    notFound();
  }

  const apiKeyId = String(formData.get("apiKeyId") ?? "");

  await revokeApiKey(membership, apiKeyId);
}

export default async function ApiKeysPage() {
  const membership = await getApiKeyViewerMembership();

  if (!membership) {
    notFound();
  }

  const [apiKeys, agents] = await Promise.all([
    prisma.apiKey.findMany({
      where: {
        organizationId: membership.organizationId,
      },
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
        agent: {
          select: {
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
  ]);

  const canCreate = canCreateApiKeys(membership.role);
  const canRevoke = canRevokeApiKeys(membership.role);

  const rows: ApiKeyRow[] = apiKeys.map((apiKey) => ({
    agentScope: apiKey.agent?.name ?? "Organization-wide",
    createdAt: apiKey.createdAt,
    expiresAt: apiKey.expiresAt,
    id: apiKey.id,
    keyPrefix: apiKey.keyPrefix,
    lastUsedAt: apiKey.lastUsedAt,
    name: apiKey.name,
    status: apiKey.status,
  }));

  const columns: DataTableColumn<ApiKeyRow>[] = [
    { header: "Name", accessor: "name" },
    { header: "Key prefix", accessor: "keyPrefix" },
    { header: "Agent scope", accessor: "agentScope" },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Last used",
      accessor: (row) => formatRelativeTime(row.lastUsedAt),
    },
    {
      header: "Created at",
      accessor: (row) => formatDateTime(row.createdAt),
    },
    {
      header: "Expires at",
      accessor: (row) => formatDateTime(row.expiresAt),
    },
    {
      header: "Action",
      accessor: (row) =>
        canRevoke && row.status !== ApiKeyStatus.REVOKED ? (
          <form action={revokeKeyAction}>
            <input name="apiKeyId" type="hidden" value={row.id} />
            <Button className="h-8" type="submit" variant="danger">
              Revoke
            </Button>
          </form>
        ) : (
          <span className="text-sm text-[#687384]">No action</span>
        ),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        description="Create, scope, and revoke hashed API keys for agent gateway calls. Full keys are never exposed after creation."
        eyebrow={membership.organization.slug}
        title="API Keys"
      />

      <ApiKeyCreateForm
        agents={agents}
        canCreate={canCreate}
        createAction={createKeyAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>Issued API keys</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="Create a key to allow an agent or developer integration to call the gateway."
            emptyTitle="No API keys"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

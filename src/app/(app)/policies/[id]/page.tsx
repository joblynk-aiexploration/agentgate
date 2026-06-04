import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { JsonViewer } from "@/components/ui/json-viewer";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { PolicyForm } from "@/app/(app)/policies/_components/policy-form";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import {
  canManagePolicies,
  getPolicyOrThrow,
  requirePolicyViewer,
} from "@/lib/policies";

type PolicyDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RuleRow = {
  action: string;
  conditionsJson: unknown;
  decision: string;
  id: string;
  requiredRole: string;
  riskOverride: string;
  tool: string;
};

export default async function PolicyDetailPage({
  params,
}: PolicyDetailPageProps) {
  const { id } = await params;
  const membership = await requirePolicyViewer();
  const canManage = canManagePolicies(membership.role);
  const policy = await getPolicyOrThrow(membership.organizationId, id);

  const ruleRows: RuleRow[] = policy.rules.map((rule) => ({
    action: rule.action ?? "Any action",
    conditionsJson: rule.conditionsJson,
    decision: rule.decision,
    id: rule.id,
    requiredRole: rule.requiredRole ?? "None",
    riskOverride: rule.riskOverride ?? "None",
    tool: rule.tool ?? "Any tool",
  }));

  const ruleColumns: DataTableColumn<RuleRow>[] = [
    {
      header: "Tool",
      accessor: (row) => formatEnumLabel(row.tool),
    },
    { header: "Action", accessor: "action" },
    {
      header: "Decision",
      accessor: (row) => <StatusBadge status={row.decision} />,
    },
    {
      header: "Required role",
      accessor: (row) => formatEnumLabel(row.requiredRole),
    },
    {
      header: "Risk override",
      accessor: (row) => formatEnumLabel(row.riskOverride),
    },
    {
      header: "Conditions",
      accessor: (row) => <JsonViewer previewOnly value={row.conditionsJson} />,
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/policies" variant="secondary">
            Back to policies
          </Button>
        }
        description={policy.description ?? "No description provided."}
        eyebrow={membership.organization.slug}
        title={policy.name}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Status</p>
            <div className="mt-3">
              <StatusBadge status={policy.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Priority</p>
            <p className="mt-3 font-semibold">{policy.priority}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Created by</p>
            <p className="mt-3 font-semibold">
              {policy.createdBy?.name ?? policy.createdBy?.email ?? "System"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Rules</p>
            <p className="mt-3 font-semibold">{policy.rules.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="font-medium text-[#5c6470]">Created</dt>
              <dd className="mt-1 font-semibold">{formatDateTime(policy.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#5c6470]">Updated</dt>
              <dd className="mt-1 font-semibold">{formatDateTime(policy.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={ruleColumns}
            data={ruleRows}
            emptyDescription="Add at least one rule to make this policy effective."
            emptyTitle="No rules"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <PolicyForm
        canManage={canManage}
        initialPolicy={{
          id: policy.id,
          description: policy.description,
          name: policy.name,
          priority: policy.priority,
          status: policy.status,
          rules: policy.rules.map((rule) => ({
            id: rule.id,
            action: rule.action,
            conditionsJson: rule.conditionsJson,
            decision: rule.decision,
            requiredRole: rule.requiredRole,
            riskOverride: rule.riskOverride,
            tool: rule.tool,
          })),
        }}
      />
    </section>
  );
}

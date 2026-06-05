import Link from "next/link";
import { FilePlus2, Plus } from "lucide-react";
import { PolicyTemplateCard } from "@/components/policies/policy-template-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { canManagePolicies, requirePolicyViewer } from "@/lib/policies";
import { formatRelativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { policyTemplates } from "@/server/policies/templates";

type PolicyRow = {
  actions: string;
  id: string;
  name: string;
  primaryDecision: string;
  priority: number;
  rulesCount: number;
  status: string;
  updatedAt: Date;
};

function getPrimaryDecision(rules: { decision: string }[]) {
  const decisions = Array.from(new Set(rules.map((rule) => rule.decision)));

  if (decisions.length === 0) {
    return "No rules";
  }

  return decisions.length === 1 ? decisions[0] : "MIXED";
}

export default async function PoliciesPage() {
  const membership = await requirePolicyViewer();
  const canManage = canManagePolicies(membership.role);

  const policies = await prisma.policy.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      priority: true,
      status: true,
      updatedAt: true,
      rules: {
        select: {
          decision: true,
        },
      },
    },
  });

  const rows: PolicyRow[] = policies.map((policy) => ({
    actions: canManage ? "Edit" : "View",
    id: policy.id,
    name: policy.name,
    primaryDecision: getPrimaryDecision(policy.rules),
    priority: policy.priority,
    rulesCount: policy.rules.length,
    status: policy.status,
    updatedAt: policy.updatedAt,
  }));

  const columns: DataTableColumn<PolicyRow>[] = [
    {
      header: "Name",
      accessor: (row) => (
        <Link
          className="font-semibold text-[#172326] hover:text-[#2d6f7f]"
          href={`/policies/${row.id}`}
        >
          {row.name}
        </Link>
      ),
    },
    {
      header: "Status",
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    { header: "Priority", accessor: "priority" },
    { header: "Rules count", accessor: "rulesCount" },
    {
      header: "Primary decision",
      accessor: (row) =>
        row.primaryDecision === "MIXED" ? (
          <span className="text-sm text-[#5c6470]">Mixed</span>
        ) : (
          <StatusBadge status={row.primaryDecision} />
        ),
    },
    {
      header: "Updated",
      accessor: (row) => formatRelativeTime(row.updatedAt),
    },
    {
      header: "Actions",
      accessor: (row) => (
        <Button className="h-8" href={`/policies/${row.id}`} variant="secondary">
          {row.actions}
        </Button>
      ),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button href="#policy-templates" variant="secondary">
                <FilePlus2 className="h-4 w-4" aria-hidden />
                Create from template
              </Button>
              <Button href="/policies/new">
                <Plus className="h-4 w-4" aria-hidden />
                New policy
              </Button>
            </div>
          ) : null
        }
        description="Manage deterministic organization policies for approvals, blocks, sandbox-only decisions, and audit-only controls."
        eyebrow={membership.organization.slug}
        title="Policies"
      />

      <Card>
        <CardHeader>
          <CardTitle>Policy rulesets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="Create policy rules to control gateway decisions for the current organization."
            emptyTitle="No policies configured"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Card id="policy-templates">
        <CardHeader>
          <CardTitle>Policy templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-5 max-w-3xl text-sm leading-6 text-[#5c6470]">
            Start with a built-in V1 policy template, then edit the assisted fields
            and JSON conditions before saving. Templates use deterministic local
            rules only.
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {policyTemplates.map((template) => (
              <PolicyTemplateCard
                canManage={canManage}
                key={template.id}
                template={template}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

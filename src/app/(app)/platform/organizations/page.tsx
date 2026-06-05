import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { requirePlatformOwner } from "@/lib/platform";
import { prisma } from "@/lib/prisma";

type OrganizationRow = {
  actionsCount: number;
  agentsCount: number;
  createdAt: Date;
  id: string;
  killSwitchEnabled: boolean;
  name: string;
  plan: string;
  slug: string;
  status: string;
  usersCount: number;
};

export default async function PlatformOrganizationsPage() {
  const membership = await requirePlatformOwner();
  const organizations = await prisma.organization.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          actionRequests: true,
          agents: true,
          memberships: true,
        },
      },
    },
  });

  const rows: OrganizationRow[] = organizations.map((organization) => ({
    actionsCount: organization._count.actionRequests,
    agentsCount: organization._count.agents,
    createdAt: organization.createdAt,
    id: organization.id,
    killSwitchEnabled: organization.killSwitchEnabled,
    name: organization.name,
    plan: organization.plan,
    slug: organization.slug,
    status: organization.status,
    usersCount: organization._count.memberships,
  }));

  const columns: DataTableColumn<OrganizationRow>[] = [
    {
      header: "Name",
      accessor: (row) => (
        <div>
          <p className="font-semibold text-[#172326]">{row.name}</p>
          <p className="text-xs text-[#687384]">{row.slug}</p>
        </div>
      ),
    },
    { header: "Plan", accessor: (row) => formatEnumLabel(row.plan) },
    { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
    {
      header: "Kill switch",
      accessor: (row) => <StatusBadge status={row.killSwitchEnabled} />,
    },
    { header: "Users", accessor: "usersCount" },
    { header: "Agents", accessor: "agentsCount" },
    { header: "Actions", accessor: "actionsCount" },
    { header: "Created", accessor: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/platform" variant="secondary">
            Back to platform
          </Button>
        }
        description="Review tenant status and high-level counts without exposing tenant secrets."
        eyebrow={membership.organization.slug}
        title="Platform Organizations"
      />

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="Organizations will appear here as tenants are created."
            emptyTitle="No organizations"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

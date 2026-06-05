import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { JsonViewer } from "@/components/ui/json-viewer";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import {
  redactSensitiveMetadata,
  summarizeAuditMetadata,
} from "@/server/audit/audit-service";
import { formatDateTime } from "@/lib/format";
import { requirePlatformOwner } from "@/lib/platform";
import { prisma } from "@/lib/prisma";

type PlatformAuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AuditRow = {
  actor: string;
  createdAt: Date;
  eventType: string;
  id: string;
  metadataJson: unknown;
  metadataSummary: string;
  organization: string;
  target: string;
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

export default async function PlatformAuditPage({
  searchParams,
}: PlatformAuditPageProps) {
  const membership = await requirePlatformOwner();
  const params = await searchParams;
  const organizationFilter = getSearchValue(params, "organizationId") ?? "";
  const eventTypeFilter = getSearchValue(params, "eventType") ?? "";
  const search = getSearchValue(params, "search") ?? "";

  const organizations = await prisma.organization.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const where = {
    organizationId:
      organizationFilter === "__platform__"
        ? null
        : organizationFilter || undefined,
    eventType: eventTypeFilter || undefined,
    OR: search
      ? [
          { eventType: { contains: search, mode: "insensitive" as const } },
          { actorType: { contains: search, mode: "insensitive" as const } },
          { actorId: { contains: search, mode: "insensitive" as const } },
          { targetType: { contains: search, mode: "insensitive" as const } },
          { targetId: { contains: search, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const [logs, filterSource] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 250,
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 1000,
      select: {
        eventType: true,
      },
    }),
  ]);

  const rows: AuditRow[] = logs.map((log) => {
    const redactedMetadata = redactSensitiveMetadata(log.metadataJson);

    return {
      actor: log.actorId ? `${log.actorType}:${log.actorId.slice(0, 8)}` : log.actorType,
      createdAt: log.createdAt,
      eventType: log.eventType,
      id: log.id,
      metadataJson: redactedMetadata,
      metadataSummary: summarizeAuditMetadata(redactedMetadata),
      organization: log.organization
        ? `${log.organization.name} (${log.organization.slug})`
        : "Platform",
      target: log.targetId
        ? `${log.targetType ?? "target"}:${log.targetId.slice(0, 8)}`
        : (log.targetType ?? "None"),
    };
  });
  const eventTypes = uniqueValues(filterSource.map((log) => log.eventType));

  const columns: DataTableColumn<AuditRow>[] = [
    { header: "Timestamp", accessor: (row) => formatDateTime(row.createdAt) },
    { header: "Organization", accessor: "organization" },
    {
      header: "Event type",
      accessor: (row) => (
        <span className="font-semibold text-[#172326]">{row.eventType}</span>
      ),
    },
    { header: "Actor", accessor: "actor" },
    { header: "Target", accessor: "target" },
    {
      header: "Metadata summary",
      accessor: (row) => (
        <details className="max-w-md">
          <summary className="cursor-pointer text-[#34404a]">
            {row.metadataSummary}
          </summary>
          <div className="mt-3">
            <JsonViewer value={row.metadataJson} />
          </div>
        </details>
      ),
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/platform" variant="secondary">
            Back to platform
          </Button>
        }
        description="Inspect platform and tenant audit events with safe metadata redaction."
        eyebrow={membership.organization.slug}
        title="Platform Audit"
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4" method="GET">
            <label className="grid gap-2 text-sm font-medium">
              Organization
              <Select defaultValue={organizationFilter} name="organizationId">
                <option value="">All organizations</option>
                <option value="__platform__">Platform-level only</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} ({organization.slug})
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Event type
              <Select defaultValue={eventTypeFilter} name="eventType">
                <option value="">Any event</option>
                {eventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Search
              <Input
                defaultValue={search}
                name="search"
                placeholder="Event, actor, target"
              />
            </label>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply filters</Button>
              <Button href="/platform/audit" variant="secondary">
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="Platform and tenant audit events will appear here."
            emptyTitle="No audit logs match"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

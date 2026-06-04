import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { JsonViewer } from "@/components/ui/json-viewer";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import {
  buildAuditLogWhere,
  canExportAuditLogs,
  redactSensitiveMetadata,
  requireAuditLogViewer,
  summarizeAuditMetadata,
} from "@/server/audit/audit-service";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { auditLogQuerySchema } from "@/lib/validators";

type AuditLogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AuditLogRow = {
  actor: string;
  actorType: string;
  createdAt: Date;
  eventType: string;
  id: string;
  ipAddress: string;
  metadataJson: unknown;
  metadataSummary: string;
  target: string;
  targetType: string;
};

function getSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function uniqueValues(values: (string | null)[]) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}

function exportHref(filters: {
  actorType?: string;
  eventType?: string;
  from?: string;
  search?: string;
  targetType?: string;
  to?: string;
}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `/api/audit-logs/export?${query}` : "/api/audit-logs/export";
}

export default async function AuditLogsPage({
  searchParams,
}: AuditLogsPageProps) {
  const membership = await requireAuditLogViewer();
  const params = await searchParams;
  const parsedFilters = auditLogQuerySchema.safeParse({
    eventType: getSearchValue(params, "eventType") || undefined,
    actorType: getSearchValue(params, "actorType") || undefined,
    targetType: getSearchValue(params, "targetType") || undefined,
    from: getSearchValue(params, "from") || undefined,
    to: getSearchValue(params, "to") || undefined,
    search: getSearchValue(params, "search") || undefined,
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : auditLogQuerySchema.parse({});
  const organizationId = membership.organizationId;

  const [logs, filterSource] = await Promise.all([
    prisma.auditLog.findMany({
      where: buildAuditLogWhere(organizationId, filters),
      orderBy: {
        createdAt: "desc",
      },
      take: 250,
    }),
    prisma.auditLog.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1000,
      select: {
        actorType: true,
        eventType: true,
        targetType: true,
      },
    }),
  ]);

  const rows: AuditLogRow[] = logs.map((log) => {
    const redactedMetadata = redactSensitiveMetadata(log.metadataJson);

    return {
      actor: log.actorId ? `${log.actorType}:${log.actorId.slice(0, 8)}` : log.actorType,
      actorType: log.actorType,
      createdAt: log.createdAt,
      eventType: log.eventType,
      id: log.id,
      ipAddress: log.ipAddress ?? "Not captured",
      metadataJson: redactedMetadata,
      metadataSummary: summarizeAuditMetadata(redactedMetadata),
      target: log.targetId
        ? `${log.targetType ?? "target"}:${log.targetId.slice(0, 8)}`
        : (log.targetType ?? "None"),
      targetType: log.targetType ?? "None",
    };
  });

  const eventTypes = uniqueValues(filterSource.map((log) => log.eventType));
  const actorTypes = uniqueValues(filterSource.map((log) => log.actorType));
  const targetTypes = uniqueValues(filterSource.map((log) => log.targetType));

  const columns: DataTableColumn<AuditLogRow>[] = [
    {
      header: "Timestamp",
      accessor: (row) => formatDateTime(row.createdAt),
    },
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
    { header: "IP address", accessor: "ipAddress" },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          canExportAuditLogs(membership.role) ? (
            <Button href={exportHref(filters)} variant="secondary">
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </Button>
          ) : null
        }
        description="Inspect immutable organization events across authentication, gateway checks, policies, API keys, approvals, and agent controls."
        eyebrow={membership.organization.slug}
        title="Audit Logs"
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-6" method="GET">
            <label className="grid gap-2 text-sm font-medium">
              Event type
              <Select defaultValue={filters.eventType ?? ""} name="eventType">
                <option value="">Any event</option>
                {eventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {eventType}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Actor type
              <Select defaultValue={filters.actorType ?? ""} name="actorType">
                <option value="">Any actor</option>
                {actorTypes.map((actorType) => (
                  <option key={actorType} value={actorType}>
                    {formatEnumLabel(actorType)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Target type
              <Select defaultValue={filters.targetType ?? ""} name="targetType">
                <option value="">Any target</option>
                {targetTypes.map((targetType) => (
                  <option key={targetType} value={targetType}>
                    {targetType}
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
            <label className="grid gap-2 text-sm font-medium">
              Search
              <Input
                defaultValue={filters.search ?? ""}
                name="search"
                placeholder="Event, actor, target"
              />
            </label>
            <div className="flex gap-2 lg:col-span-6">
              <Button type="submit">Apply filters</Button>
              <Button href="/audit-logs" variant="secondary">
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization audit trail</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            emptyDescription="Security-relevant events for this organization will appear here."
            emptyTitle="No audit logs match"
            rowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    </section>
  );
}

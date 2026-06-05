import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { JsonViewer } from "@/components/ui/json-viewer";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActionOrThrow, requireActionViewer } from "@/lib/actions";
import { redactSensitiveMetadata } from "@/server/audit/audit-service";
import {
  formatDateTime,
  formatEnumLabel,
  formatRelativeTime,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

type ActionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type TimelineRow = {
  actor: string;
  eventType: string;
  id: string;
  metadataJson: unknown;
  target: string;
  time: Date;
};

function riskSignals(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function extractExecution(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const metadata = value as Record<string, unknown>;
  const execution = metadata.execution;

  return execution && typeof execution === "object" ? execution : null;
}

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function buildCurl(action: {
  action: string;
  agent: { slug: string };
  environment: string;
  metadataJson: unknown;
  payloadJson: unknown;
  reason: string;
  tool: string;
}) {
  return `curl -X POST http://localhost:3000/api/gateway/check \\
  -H "Authorization: Bearer <ag_test_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '${prettyJson({
    agentId: action.agent.slug,
    tool: action.tool.toLowerCase(),
    action: action.action,
    environment: action.environment,
    reason: action.reason,
    payload: action.payloadJson ?? {},
    metadata: action.metadataJson ?? {},
  })}'`;
}

export default async function ActionDetailPage({ params }: ActionDetailPageProps) {
  const { id } = await params;
  const membership = await requireActionViewer();
  const action = await getActionOrThrow(membership.organizationId, id);
  const riskAssessment = action.riskAssessments.at(0);
  const redactedMetadata = redactSensitiveMetadata(action.metadataJson);
  const execution = extractExecution(redactedMetadata);
  const auditTargets = [
    {
      targetId: action.id,
    },
    ...(action.approvalRequest
      ? [
          {
            targetId: action.approvalRequest.id,
          },
        ]
      : []),
  ];

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: membership.organizationId,
      OR: auditTargets,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 100,
  });

  const timelineRows: TimelineRow[] = auditLogs.map((log) => ({
    actor: log.actorId ? `${log.actorType}:${log.actorId.slice(0, 8)}` : log.actorType,
    eventType: log.eventType,
    id: log.id,
    metadataJson: redactSensitiveMetadata(log.metadataJson),
    target: log.targetId
      ? `${log.targetType ?? "target"}:${log.targetId.slice(0, 8)}`
      : (log.targetType ?? "None"),
    time: log.createdAt,
  }));
  const signals = riskSignals(riskAssessment?.signalsJson);
  const curlText = buildCurl({
    action: action.action,
    agent: action.agent,
    environment: action.environment,
    metadataJson: redactedMetadata,
    payloadJson: action.payloadJson,
    reason: action.reason,
    tool: action.tool,
  });
  const requestJson = prettyJson({
    agentId: action.agent.slug,
    tool: action.tool,
    action: action.action,
    environment: action.environment,
    reason: action.reason,
    payload: action.payloadJson,
    metadata: redactedMetadata,
  });

  const timelineColumns: DataTableColumn<TimelineRow>[] = [
    {
      header: "Time",
      accessor: (row) => formatDateTime(row.time),
    },
    { header: "Event", accessor: "eventType" },
    { header: "Actor", accessor: "actor" },
    { header: "Target", accessor: "target" },
    {
      header: "Metadata",
      accessor: (row) => <JsonViewer previewOnly value={row.metadataJson} />,
    },
  ];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <CopyButton label="Copy JSON" text={requestJson} />
            <CopyButton label="Copy curl" text={curlText} />
            <Button href="/actions" variant="secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to actions
            </Button>
          </div>
        }
        description="Read-only, replay-safe inspection for a single AI action request. No execution or replay is triggered from this page."
        eyebrow={membership.organization.slug}
        title={action.action}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Decision</p>
            <div className="mt-3">
              <StatusBadge status={action.decision} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Status</p>
            <div className="mt-3">
              <StatusBadge status={action.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Risk</p>
            <div className="mt-3 flex items-center gap-2">
              <RiskBadge risk={action.riskLevel} />
              <span className="text-sm font-semibold">{action.riskScore}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Requires approval</p>
            <div className="mt-3">
              <StatusBadge status={action.requiresApproval} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Action request</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="font-medium text-[#5c6470]">Action request ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs">{action.id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Agent</dt>
                  <dd className="mt-1 font-semibold">
                    <Link className="hover:text-[#2d6f7f]" href={`/agents/${action.agent.id}`}>
                      {action.agent.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">API key prefix</dt>
                  <dd className="mt-1 font-semibold">
                    {action.apiKey?.keyPrefix ?? "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Tool</dt>
                  <dd className="mt-1 font-semibold">{formatEnumLabel(action.tool)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Environment</dt>
                  <dd className="mt-1 font-semibold">{action.environment}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Requested</dt>
                  <dd className="mt-1 font-semibold">{formatDateTime(action.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Idempotency key</dt>
                  <dd className="mt-1 break-all font-semibold">
                    {action.idempotencyKey ?? "None"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Policy matched</dt>
                  <dd className="mt-1 font-semibold">
                    {action.policyMatched ? (
                      <Link
                        className="hover:text-[#2d6f7f]"
                        href={`/policies/${action.policyMatched.id}`}
                      >
                        {action.policyMatched.name}
                      </Link>
                    ) : (
                      "Risk engine fallback"
                    )}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-[#e5e9ef] pt-5 text-sm leading-6 text-[#34404a]">
                <span className="font-semibold text-[#172326]">Reason:</span>{" "}
                {action.reason}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk assessment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                {signals.length > 0 ? (
                  signals.map((signal) => (
                    <span
                      className="border border-[#d9dee8] bg-[#f8fafc] px-2 py-1 text-xs font-medium text-[#34404a]"
                      key={signal}
                    >
                      {formatEnumLabel(signal)}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[#687384]">No signals recorded</span>
                )}
              </div>
              <p className="text-sm leading-6 text-[#34404a]">
                {riskAssessment?.explanation ?? action.reason}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payload JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer value={action.payloadJson} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer value={redactedMetadata} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={timelineColumns}
                data={timelineRows}
                emptyDescription="Gateway checks, approvals, executions, comments, and webhook callbacks will appear here."
                emptyTitle="No audit timeline"
                rowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval request</CardTitle>
            </CardHeader>
            <CardContent>
              {action.approvalRequest ? (
                <dl className="grid gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-[#5c6470]">Status</dt>
                    <dd className="mt-1">
                      <StatusBadge status={action.approvalRequest.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#5c6470]">Required role</dt>
                    <dd className="mt-1 font-semibold">
                      {action.approvalRequest.requiredRole
                        ? formatEnumLabel(action.approvalRequest.requiredRole)
                        : "Any reviewer"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#5c6470]">Updated</dt>
                    <dd className="mt-1 font-semibold">
                      {formatRelativeTime(action.approvalRequest.updatedAt)}
                    </dd>
                  </div>
                  <div>
                    <Button href={`/approvals/${action.approvalRequest.id}`} variant="secondary">
                      <ClipboardCheck className="h-4 w-4" aria-hidden />
                      Open approval
                    </Button>
                  </div>
                </dl>
              ) : (
                <p className="text-sm leading-6 text-[#687384]">
                  This action did not create an approval request.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Execution result</CardTitle>
            </CardHeader>
            <CardContent>
              {execution ? (
                <JsonViewer value={execution} />
              ) : (
                <p className="text-sm leading-6 text-[#687384]">
                  No simulated execution result is recorded for this action.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Replay safety</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-6 text-[#34404a]">
              <p>
                This page is inspection-only. Copy buttons export the original request
                shape for debugging, but AgentGate does not recheck, replay, or execute
                actions from this screen.
              </p>
              <p>
                API key full values are never displayed. Only stored display prefixes
                appear for traceability.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

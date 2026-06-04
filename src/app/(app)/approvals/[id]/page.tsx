import { ApprovalStatus } from "@/generated/prisma/client";
import { ApprovalActions } from "@/app/(app)/approvals/_components/approval-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { JsonViewer } from "@/components/ui/json-viewer";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canActOnApproval,
  getApprovalOrThrow,
  requireApprovalViewer,
} from "@/lib/approvals";
import { redactSensitiveMetadata } from "@/server/audit/audit-service";
import {
  formatDateTime,
  formatEnumLabel,
  formatRelativeTime,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

type ApprovalDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type HistoryRow = {
  actor: string;
  eventType: string;
  id: string;
  metadataJson: unknown;
  time: Date;
};

function userLabel(user: { email: string; name: string | null } | null) {
  return user?.name ?? user?.email ?? "Unassigned";
}

function riskSignals(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, entry]) => `${key}: ${String(entry)}`);
  }

  return [];
}

export default async function ApprovalDetailPage({
  params,
}: ApprovalDetailPageProps) {
  const { id } = await params;
  const membership = await requireApprovalViewer();
  const approval = await getApprovalOrThrow(membership.organizationId, id);
  const actionRequest = approval.actionRequest;
  const riskAssessment = actionRequest.riskAssessments.at(0);
  const canAct = canActOnApproval(membership, approval);
  const isPendingApproval =
    approval.status === ApprovalStatus.PENDING ||
    approval.status === ApprovalStatus.EDITED;

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: membership.organizationId,
      targetId: actionRequest.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  const historyRows: HistoryRow[] = auditLogs.map((log) => ({
    actor: log.actorId ? `${log.actorType}:${log.actorId.slice(0, 8)}` : log.actorType,
    eventType: log.eventType,
    id: log.id,
    metadataJson: redactSensitiveMetadata(log.metadataJson),
    time: log.createdAt,
  }));

  const historyColumns: DataTableColumn<HistoryRow>[] = [
    {
      header: "Time",
      accessor: (row) => formatRelativeTime(row.time),
    },
    { header: "Event", accessor: "eventType" },
    { header: "Actor", accessor: "actor" },
    {
      header: "Metadata",
      accessor: (row) => <JsonViewer previewOnly value={row.metadataJson} />,
    },
  ];

  const signals = riskSignals(riskAssessment?.signalsJson);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <Button href="/approvals" variant="secondary">
            Back to approvals
          </Button>
        }
        description={actionRequest.reason}
        eyebrow={membership.organization.slug}
        title={`${actionRequest.agent.name} approval`}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Approval status</p>
            <div className="mt-3">
              <StatusBadge status={approval.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Risk</p>
            <div className="mt-3 flex items-center gap-2">
              <RiskBadge risk={actionRequest.riskLevel} />
              <span className="text-sm font-semibold">{actionRequest.riskScore}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Required role</p>
            <p className="mt-3 font-semibold">
              {approval.requiredRole
                ? formatEnumLabel(approval.requiredRole)
                : "Any reviewer"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-[#5c6470]">Requested</p>
            <p className="mt-3 font-semibold">{formatRelativeTime(approval.createdAt)}</p>
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
                  <dt className="font-medium text-[#5c6470]">Agent</dt>
                  <dd className="mt-1 font-semibold">{actionRequest.agent.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Tool</dt>
                  <dd className="mt-1 font-semibold">
                    {formatEnumLabel(actionRequest.tool)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Action</dt>
                  <dd className="mt-1 font-semibold">{actionRequest.action}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Environment</dt>
                  <dd className="mt-1 font-semibold">{actionRequest.environment}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Policy matched</dt>
                  <dd className="mt-1 font-semibold">
                    {actionRequest.policyMatched?.name ?? "Risk engine fallback"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Requested time</dt>
                  <dd className="mt-1 font-semibold">
                    {formatDateTime(actionRequest.createdAt)}
                  </dd>
                </div>
              </dl>
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
                {riskAssessment?.explanation ?? actionRequest.reason}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payload JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer value={actionRequest.payloadJson} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer value={actionRequest.metadataJson} />
            </CardContent>
          </Card>

          {approval.editedPayloadJson ? (
            <Card>
              <CardHeader>
                <CardTitle>Edited payload</CardTitle>
              </CardHeader>
              <CardContent>
                <JsonViewer value={approval.editedPayloadJson} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Action history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={historyColumns}
                data={historyRows}
                emptyDescription="Approval decisions and gateway events will appear here."
                emptyTitle="No action history"
                rowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Reviewer state</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                <div>
                  <dt className="font-medium text-[#5c6470]">Assigned to</dt>
                  <dd className="mt-1 font-semibold">{userLabel(approval.assignedTo)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Reviewed by</dt>
                  <dd className="mt-1 font-semibold">{userLabel(approval.reviewedBy)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Review comment</dt>
                  <dd className="mt-1 whitespace-pre-wrap font-semibold">
                    {approval.reviewComment ?? "No comment"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[#5c6470]">Updated</dt>
                  <dd className="mt-1 font-semibold">{formatDateTime(approval.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalActions
                approvalId={approval.id}
                canAct={canAct}
                initialEditedPayload={approval.editedPayloadJson}
                initialPayload={actionRequest.payloadJson}
                isPendingApproval={isPendingApproval}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

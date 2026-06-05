import { ApprovalStatus } from "@/generated/prisma/client";
import { ApprovalActions } from "@/app/(app)/approvals/_components/approval-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { JsonViewer } from "@/components/ui/json-viewer";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import {
  canActOnApproval,
  canCommentOnApproval,
  createApprovalComment,
  getApprovalOrThrow,
  listApprovalComments,
  requireApprovalViewer,
} from "@/lib/approvals";
import { redactSensitiveMetadata } from "@/server/audit/audit-service";
import {
  formatDateTime,
  formatEnumLabel,
  formatRelativeTime,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { approvalCommentSchema } from "@/lib/validators";

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

type TimelineItem = {
  actor?: string;
  description: string;
  id: string;
  metadata?: unknown;
  time: Date;
  title: string;
};

async function addCommentAction(approvalId: string, formData: FormData) {
  "use server";

  const membership = await requireApprovalViewer();
  const input = approvalCommentSchema.parse({
    body: formData.get("body"),
  });

  await createApprovalComment(membership, approvalId, input);
}

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

function auditTimelineTitle(eventType: string) {
  const labels: Record<string, string> = {
    "approval.approved": "Approved",
    "approval.rejected": "Rejected",
    "approval.payload_edited": "Payload edited",
    "gateway.action_executed": "Executed",
    "gateway.action_cancelled": "Cancelled",
    "action.blocked": "Blocked",
    "gateway.action_checked": "Gateway checked action",
    "approval.requested": "Approval requested",
  };

  return labels[eventType] ?? formatEnumLabel(eventType);
}

function auditTimelineDescription(eventType: string) {
  const descriptions: Record<string, string> = {
    "approval.approved": "A reviewer approved the request.",
    "approval.rejected": "A reviewer rejected the request.",
    "approval.payload_edited": "A reviewer saved an edited payload for review.",
    "gateway.action_executed": "The gateway simulated execution for an approved or allowed action.",
    "gateway.action_cancelled": "The gateway cancelled the pending action.",
    "action.blocked": "The gateway blocked the action.",
    "gateway.action_checked": "The gateway evaluated the request with local risk and policy logic.",
    "approval.requested": "Policy required a human approval before execution.",
  };

  return descriptions[eventType] ?? "Audit event recorded.";
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
  const canComment = canCommentOnApproval(membership.role);
  const isPendingApproval =
    approval.status === ApprovalStatus.PENDING ||
    approval.status === ApprovalStatus.EDITED;
  const comments = await listApprovalComments(membership, approval.id);

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: membership.organizationId,
      OR: [
        {
          targetId: actionRequest.id,
        },
        {
          targetId: approval.id,
        },
      ],
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

  const timelineItems: TimelineItem[] = [
    {
      description: `${actionRequest.agent.name} requested ${actionRequest.action} through ${formatEnumLabel(actionRequest.tool)}.`,
      id: `action-requested-${actionRequest.id}`,
      time: actionRequest.createdAt,
      title: "Action requested",
    },
    ...(riskAssessment
      ? [
          {
            description: riskAssessment.explanation,
            id: `risk-assessed-${riskAssessment.id}`,
            metadata: {
              level: riskAssessment.level,
              score: riskAssessment.score,
              signals: riskAssessment.signalsJson,
            },
            time: riskAssessment.createdAt,
            title: "Risk assessed",
          },
        ]
      : []),
    ...(actionRequest.policyMatched
      ? [
          {
            description: `${actionRequest.policyMatched.name} matched this action.`,
            id: `policy-matched-${actionRequest.policyMatched.id}`,
            time: approval.createdAt,
            title: "Policy matched",
          },
        ]
      : []),
    {
      description: approval.requiredRole
        ? `${formatEnumLabel(approval.requiredRole)} review is required.`
        : "Human review is required.",
      id: `approval-requested-${approval.id}`,
      time: approval.createdAt,
      title: "Approval requested",
    },
    ...comments.map((comment) => ({
      actor: userLabel(comment.author),
      description: comment.body,
      id: `comment-${comment.id}`,
      time: comment.createdAt,
      title: "Comment added",
    })),
    ...auditLogs
      .filter((log) => log.eventType !== "approval.comment_added")
      .map((log) => ({
        actor: log.actorId
          ? `${log.actorType}:${log.actorId.slice(0, 8)}`
          : log.actorType,
        description: auditTimelineDescription(log.eventType),
        id: `audit-${log.id}`,
        metadata: redactSensitiveMetadata(log.metadataJson),
        time: log.createdAt,
        title: auditTimelineTitle(log.eventType),
      })),
  ].sort((first, second) => first.time.getTime() - second.time.getTime());

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
        description="Review the policy reason, risk signals, payload, and audit history before deciding whether this simulated action may proceed."
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
              <CardTitle>Decision context</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-6 text-[#34404a]">
              <p>
                <span className="font-semibold text-[#172326]">Reason:</span>{" "}
                {actionRequest.reason}
              </p>
              <p>
                <span className="font-semibold text-[#172326]">V1 behavior:</span>{" "}
                approval changes the action status only. External tools are simulated
                and no real refund, email, Slack message, webhook, or database write is sent.
              </p>
            </CardContent>
          </Card>

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
              <CardTitle>Activity timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineItems.length > 0 ? (
                <ol className="grid gap-4">
                  {timelineItems.map((item) => (
                    <li className="border-l-2 border-[#cbd3df] pl-4" key={item.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{item.title}</p>
                        <time className="text-xs text-[#687384]">
                          {formatDateTime(item.time)}
                        </time>
                      </div>
                      {item.actor ? (
                        <p className="mt-1 text-xs text-[#687384]">{item.actor}</p>
                      ) : null}
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#34404a]">
                        {item.description}
                      </p>
                      {item.metadata ? (
                        <div className="mt-3">
                          <JsonViewer previewOnly value={item.metadata} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-[#687384]">
                  Approval activity will appear here.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={historyColumns}
                data={historyRows}
                emptyDescription="Approval decisions and gateway events will appear here."
                emptyTitle="No audit history"
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

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-4">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <article
                      className="border border-[#d9dee8] bg-[#f8fafc] p-3"
                      key={comment.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{userLabel(comment.author)}</p>
                        <time className="text-xs text-[#687384]">
                          {formatRelativeTime(comment.createdAt)}
                        </time>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#34404a]">
                        {comment.body}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-[#687384]">
                    No comments yet. Reviewer discussion stays tenant-scoped and audited.
                  </p>
                )}
              </div>

              {canComment ? (
                <form action={addCommentAction.bind(null, approval.id)} className="grid gap-3">
                  <label className="grid gap-2 text-sm font-medium">
                    Add comment
                    <Textarea
                      maxLength={2000}
                      name="body"
                      placeholder="Add review context, questions, or approval notes."
                      required
                      rows={4}
                    />
                  </label>
                  <Button type="submit">Add comment</Button>
                </form>
              ) : (
                <p className="border border-[#d9dee8] bg-[#f8fafc] p-3 text-sm text-[#687384]">
                  Your role can view comments but cannot add new approval comments.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

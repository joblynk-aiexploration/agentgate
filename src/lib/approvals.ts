import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  ActionStatus,
  ApprovalStatus,
  type MembershipRole,
  type Prisma,
} from "@/generated/prisma/client";
import { createAuditLog } from "@/server/audit/audit-service";
import { getCurrentMembership } from "@/lib/auth";
import {
  createRoleNotifications,
  createUserNotification,
} from "@/lib/notifications";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type {
  approvalEditSchema,
  approvalCommentSchema,
  approvalListQuerySchema,
  approvalReviewSchema,
} from "@/lib/validators";
import type { z } from "zod";

export type ApprovalMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;
export type ApprovalListQuery = z.infer<typeof approvalListQuerySchema>;
export type ApprovalReviewInput = z.infer<typeof approvalReviewSchema>;
export type ApprovalEditInput = z.infer<typeof approvalEditSchema>;
export type ApprovalCommentInput = z.infer<typeof approvalCommentSchema>;

const approvalViewRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "reviewer",
  "auditor",
];

const elevatedReviewerRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
];

const approvalCommenterRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "reviewer",
];

export function canViewApprovals(role: MembershipRole) {
  return hasRole(role, approvalViewRoles);
}

export function isElevatedReviewer(role: MembershipRole) {
  return hasRole(role, elevatedReviewerRoles);
}

export function canCommentOnApproval(role: MembershipRole) {
  return hasRole(role, approvalCommenterRoles);
}

export function canActOnApproval(
  membership: Pick<ApprovalMembership, "role" | "userId">,
  approval: {
    assignedToId: string | null;
    requiredRole: MembershipRole | null;
  },
) {
  if (isElevatedReviewer(membership.role)) {
    return true;
  }

  if (approval.assignedToId === membership.userId) {
    return true;
  }

  return Boolean(approval.requiredRole && approval.requiredRole === membership.role);
}

export async function requireApprovalViewer() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canViewApprovals(membership.role)) {
    notFound();
  }

  return membership;
}

export async function getApiApprovalMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canViewApprovals(membership.role)) {
    return null;
  }

  return membership;
}

async function getApprovalScopeOrThrow(
  organizationId: string,
  approvalId: string,
) {
  const approval = await prisma.approvalRequest.findFirst({
    where: {
      id: approvalId,
      organizationId,
    },
    select: {
      id: true,
      actionRequestId: true,
    },
  });

  if (!approval) {
    throw new Error("Approval request not found.");
  }

  return approval;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function dayRange(dateValue?: string) {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);

  return {
    gte: date,
    lt: nextDay,
  };
}

export function buildApprovalWhere(
  organizationId: string,
  userId: string,
  query: ApprovalListQuery,
): Prisma.ApprovalRequestWhereInput {
  const createdAt = dayRange(query.date);

  return {
    organizationId,
    status: query.status,
    assignedToId: query.assignedToMe ? userId : undefined,
    createdAt,
    actionRequest: {
      riskLevel: query.riskLevel,
      tool: query.tool,
      agentId: query.agentId || undefined,
    },
  };
}

export async function getApprovalOrThrow(
  organizationId: string,
  approvalId: string,
) {
  const approval = await prisma.approvalRequest.findFirst({
    where: {
      id: approvalId,
      organizationId,
    },
    include: {
      assignedTo: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
      reviewedBy: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
      actionRequest: {
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          policyMatched: {
            select: {
              id: true,
              name: true,
            },
          },
          riskAssessments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!approval) {
    notFound();
  }

  return approval;
}

export async function listApprovalComments(
  membership: ApprovalMembership,
  approvalId: string,
) {
  await getApprovalScopeOrThrow(membership.organizationId, approvalId);

  return prisma.approvalComment.findMany({
    where: {
      organizationId: membership.organizationId,
      approvalRequestId: approvalId,
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      author: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function createApprovalComment(
  membership: ApprovalMembership,
  approvalId: string,
  input: ApprovalCommentInput,
) {
  if (!canCommentOnApproval(membership.role)) {
    throw new Error("You are not allowed to comment on approval requests.");
  }

  const approval = await getApprovalScopeOrThrow(
    membership.organizationId,
    approvalId,
  );

  const comment = await prisma.approvalComment.create({
    data: {
      organizationId: membership.organizationId,
      approvalRequestId: approval.id,
      authorUserId: membership.userId,
      body: input.body.trim(),
    },
    include: {
      author: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "approval.comment_added",
    targetType: "ApprovalRequest",
    targetId: approval.id,
    metadataJson: {
      actionRequestId: approval.actionRequestId,
      commentId: comment.id,
    },
  });

  revalidatePath(`/approvals/${approval.id}`);

  return comment;
}

async function getReviewableApproval(
  membership: ApprovalMembership,
  approvalId: string,
) {
  const approval = await prisma.approvalRequest.findFirst({
    where: {
      id: approvalId,
      organizationId: membership.organizationId,
    },
    select: {
      id: true,
      actionRequestId: true,
      assignedToId: true,
      requiredRole: true,
      status: true,
      actionRequest: {
        select: {
          id: true,
          action: true,
          agentId: true,
          status: true,
          tool: true,
        },
      },
    },
  });

  if (!approval) {
    throw new Error("Approval request not found.");
  }

  if (!canActOnApproval(membership, approval)) {
    throw new Error("You are not allowed to review this approval request.");
  }

  return approval;
}

function assertReviewableStatus(status: ApprovalStatus) {
  if (status !== ApprovalStatus.PENDING && status !== ApprovalStatus.EDITED) {
    throw new Error("Approval request is no longer pending review.");
  }
}

export async function approveApproval(
  membership: ApprovalMembership,
  approvalId: string,
  input: ApprovalReviewInput,
) {
  const existing = await getReviewableApproval(membership, approvalId);
  assertReviewableStatus(existing.status);

  const approval = await prisma.$transaction(async (tx) => {
    const updatedApproval = await tx.approvalRequest.update({
      where: {
        id: existing.id,
        organizationId: membership.organizationId,
      },
      data: {
        status: ApprovalStatus.APPROVED,
        reviewedById: membership.userId,
        reviewComment: input.comment?.trim() || null,
      },
    });

    await tx.actionRequest.update({
      where: {
        id: existing.actionRequestId,
        organizationId: membership.organizationId,
      },
      data: {
        status: ActionStatus.APPROVED,
      },
    });

    return updatedApproval;
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "approval.approved",
    targetType: "ActionRequest",
    targetId: existing.actionRequestId,
    metadataJson: {
      approvalRequestId: approval.id,
      action: existing.actionRequest.action,
      tool: existing.actionRequest.tool,
      comment: input.comment?.trim() || null,
    },
  });

  await createRoleNotifications(
    membership.organizationId,
    [
      "org_owner",
      "security_admin",
      ...(existing.requiredRole ? [existing.requiredRole] : []),
    ],
    {
      type: "approval.approved",
      title: "Approval request approved",
      body: `${existing.actionRequest.action} was approved for ${existing.actionRequest.tool}.`,
      metadataJson: {
        approvalRequestId: approval.id,
        actionRequestId: existing.actionRequestId,
        action: existing.actionRequest.action,
        tool: existing.actionRequest.tool,
      },
    },
  );

  if (existing.assignedToId && existing.assignedToId !== membership.userId) {
    await createUserNotification(membership.organizationId, existing.assignedToId, {
      type: "approval.approved",
      title: "Assigned approval approved",
      body: `${existing.actionRequest.action} was approved.`,
      metadataJson: {
        approvalRequestId: approval.id,
        actionRequestId: existing.actionRequestId,
      },
    });
  }

  revalidatePath("/approvals");
  revalidatePath(`/approvals/${approval.id}`);

  return approval;
}

export async function rejectApproval(
  membership: ApprovalMembership,
  approvalId: string,
  input: ApprovalReviewInput,
) {
  const existing = await getReviewableApproval(membership, approvalId);
  assertReviewableStatus(existing.status);

  const approval = await prisma.$transaction(async (tx) => {
    const updatedApproval = await tx.approvalRequest.update({
      where: {
        id: existing.id,
        organizationId: membership.organizationId,
      },
      data: {
        status: ApprovalStatus.REJECTED,
        reviewedById: membership.userId,
        reviewComment: input.comment?.trim() || null,
      },
    });

    await tx.actionRequest.update({
      where: {
        id: existing.actionRequestId,
        organizationId: membership.organizationId,
      },
      data: {
        status: ActionStatus.REJECTED,
      },
    });

    return updatedApproval;
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "approval.rejected",
    targetType: "ActionRequest",
    targetId: existing.actionRequestId,
    metadataJson: {
      approvalRequestId: approval.id,
      action: existing.actionRequest.action,
      tool: existing.actionRequest.tool,
      comment: input.comment?.trim() || null,
    },
  });

  await createRoleNotifications(
    membership.organizationId,
    [
      "org_owner",
      "security_admin",
      ...(existing.requiredRole ? [existing.requiredRole] : []),
    ],
    {
      type: "approval.rejected",
      title: "Approval request rejected",
      body: `${existing.actionRequest.action} was rejected for ${existing.actionRequest.tool}.`,
      metadataJson: {
        approvalRequestId: approval.id,
        actionRequestId: existing.actionRequestId,
        action: existing.actionRequest.action,
        tool: existing.actionRequest.tool,
      },
    },
  );

  if (existing.assignedToId && existing.assignedToId !== membership.userId) {
    await createUserNotification(membership.organizationId, existing.assignedToId, {
      type: "approval.rejected",
      title: "Assigned approval rejected",
      body: `${existing.actionRequest.action} was rejected.`,
      metadataJson: {
        approvalRequestId: approval.id,
        actionRequestId: existing.actionRequestId,
      },
    });
  }

  revalidatePath("/approvals");
  revalidatePath(`/approvals/${approval.id}`);

  return approval;
}

export async function editApprovalPayload(
  membership: ApprovalMembership,
  approvalId: string,
  input: ApprovalEditInput,
) {
  const existing = await getReviewableApproval(membership, approvalId);
  assertReviewableStatus(existing.status);

  const approval = await prisma.approvalRequest.update({
    where: {
      id: existing.id,
      organizationId: membership.organizationId,
    },
    data: {
      editedPayloadJson: toJsonValue(input.editedPayloadJson),
      reviewComment: input.comment?.trim() || null,
      // V1 keeps the request pending after payload edits so the reviewer can
      // still make an explicit approve/reject decision in the same inbox flow.
      status: ApprovalStatus.PENDING,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "approval.payload_edited",
    targetType: "ActionRequest",
    targetId: existing.actionRequestId,
    metadataJson: {
      approvalRequestId: approval.id,
      action: existing.actionRequest.action,
      tool: existing.actionRequest.tool,
      comment: input.comment?.trim() || null,
    },
  });

  revalidatePath("/approvals");
  revalidatePath(`/approvals/${approval.id}`);

  return approval;
}

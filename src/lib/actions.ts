import { notFound, redirect } from "next/navigation";
import type { MembershipRole, Prisma } from "@/generated/prisma/client";
import { getCurrentMembership } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { actionListQuerySchema } from "@/lib/validators";
import type { z } from "zod";

export type ActionMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;
export type ActionListQuery = z.infer<typeof actionListQuerySchema>;

const actionViewRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
  "reviewer",
  "auditor",
];

function parseDateStart(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDateEnd(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  date.setDate(date.getDate() + 1);

  return date;
}

export function canViewActions(role: MembershipRole) {
  return hasRole(role, actionViewRoles);
}

export async function requireActionViewer() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canViewActions(membership.role)) {
    notFound();
  }

  return membership;
}

export async function getApiActionMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canViewActions(membership.role)) {
    return null;
  }

  return membership;
}

export function buildActionWhere(
  organizationId: string,
  query: ActionListQuery,
): Prisma.ActionRequestWhereInput {
  return {
    organizationId,
    status: query.status,
    decision: query.decision,
    riskLevel: query.riskLevel,
    tool: query.tool,
    agentId: query.agentId || undefined,
    environment: query.environment
      ? {
          equals: query.environment,
          mode: "insensitive",
        }
      : undefined,
    createdAt: {
      gte: parseDateStart(query.from),
      lt: parseDateEnd(query.to),
    },
  };
}

export async function getActionOrThrow(
  organizationId: string,
  actionRequestId: string,
) {
  const actionRequest = await prisma.actionRequest.findFirst({
    where: {
      id: actionRequestId,
      organizationId,
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          riskTier: true,
        },
      },
      apiKey: {
        select: {
          id: true,
          keyPrefix: true,
          name: true,
          status: true,
        },
      },
      policyMatched: {
        select: {
          id: true,
          name: true,
          priority: true,
          status: true,
        },
      },
      approvalRequest: {
        select: {
          id: true,
          status: true,
          requiredRole: true,
          reviewedById: true,
          reviewComment: true,
          editedPayloadJson: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      riskAssessments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!actionRequest) {
    notFound();
  }

  return actionRequest;
}

import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { hasRole, roleRules } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const membership = await getCurrentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(membership.role, roleRules.viewReports)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const approvals = await prisma.approvalRequest.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5_000,
    select: {
      actionRequestId: true,
      createdAt: true,
      requiredRole: true,
      reviewComment: true,
      reviewedBy: {
        select: {
          email: true,
          name: true,
        },
      },
      status: true,
      updatedAt: true,
    },
  });

  const csv = toCsv([
    [
      "createdAt",
      "actionRequestId",
      "status",
      "requiredRole",
      "reviewedBy",
      "reviewComment",
      "updatedAt",
    ],
    ...approvals.map((approval) => [
      approval.createdAt,
      approval.actionRequestId,
      approval.status,
      approval.requiredRole ?? "",
      approval.reviewedBy
        ? `${approval.reviewedBy.name} <${approval.reviewedBy.email}>`
        : "",
      approval.reviewComment ?? "",
      approval.updatedAt,
    ]),
  ]);

  return csvResponse(
    csv,
    `agentgate-approvals-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

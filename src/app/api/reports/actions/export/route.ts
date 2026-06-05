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

  const actions = await prisma.actionRequest.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5_000,
    select: {
      action: true,
      createdAt: true,
      decision: true,
      environment: true,
      reason: true,
      requiresApproval: true,
      riskLevel: true,
      riskScore: true,
      status: true,
      tool: true,
      agent: {
        select: {
          name: true,
        },
      },
    },
  });

  const csv = toCsv([
    [
      "createdAt",
      "agent",
      "tool",
      "action",
      "environment",
      "riskScore",
      "riskLevel",
      "decision",
      "status",
      "requiresApproval",
      "reason",
    ],
    ...actions.map((action) => [
      action.createdAt,
      action.agent.name,
      action.tool,
      action.action,
      action.environment,
      action.riskScore,
      action.riskLevel,
      action.decision,
      action.status,
      action.requiresApproval,
      action.reason,
    ]),
  ]);

  return csvResponse(
    csv,
    `agentgate-actions-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

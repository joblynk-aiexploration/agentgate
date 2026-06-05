import { NextResponse } from "next/server";
import { getActionOrThrow, getApiActionMembership } from "@/lib/actions";
import { redactSensitiveMetadata } from "@/server/audit/audit-service";
import { prisma } from "@/lib/prisma";

type ActionRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: ActionRouteContext) {
  const membership = await getApiActionMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const action = await getActionOrThrow(membership.organizationId, id);
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

  return NextResponse.json({
    action: {
      ...action,
      metadataJson: redactSensitiveMetadata(action.metadataJson),
      apiKey: action.apiKey
        ? {
            id: action.apiKey.id,
            keyPrefix: action.apiKey.keyPrefix,
            name: action.apiKey.name,
            status: action.apiKey.status,
          }
        : null,
    },
    auditLogs: auditLogs.map((log) => ({
      ...log,
      metadataJson: redactSensitiveMetadata(log.metadataJson),
    })),
  });
}

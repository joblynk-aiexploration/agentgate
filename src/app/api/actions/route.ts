import { NextResponse } from "next/server";
import { buildActionWhere, getApiActionMembership } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { actionListQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const membership = await getApiActionMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = actionListQuerySchema.safeParse({
    status: searchParams.get("status") || undefined,
    decision: searchParams.get("decision") || undefined,
    riskLevel: searchParams.get("riskLevel") || undefined,
    tool: searchParams.get("tool") || undefined,
    agentId: searchParams.get("agentId") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    environment: searchParams.get("environment") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const actions = await prisma.actionRequest.findMany({
    where: buildActionWhere(membership.organizationId, parsed.data),
    orderBy: {
      createdAt: "desc",
    },
    take: 250,
    select: {
      id: true,
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
          id: true,
          name: true,
          slug: true,
        },
      },
      apiKey: {
        select: {
          id: true,
          keyPrefix: true,
          name: true,
        },
      },
      approvalRequest: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({ actions });
}

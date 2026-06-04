import { NextResponse } from "next/server";
import { AgentStatus } from "@/generated/prisma/client";
import {
  assertOwnerInOrganization,
  getApiAgentManagerMembership,
  getApiAgentMembership,
  normalizeAllowedTools,
} from "@/lib/agents";
import { createAuditLog } from "@/server/audit/audit-service";
import { prisma } from "@/lib/prisma";
import { agentInputSchema } from "@/lib/validators";

export async function GET() {
  const membership = await getApiAgentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [agents, actionCounts] = await Promise.all([
    prisma.agent.findMany({
      where: {
        organizationId: membership.organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        department: true,
        status: true,
        riskTier: true,
        allowedToolsJson: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        actionRequests: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            createdAt: true,
          },
        },
      },
    }),
    prisma.actionRequest.groupBy({
      by: ["agentId"],
      where: {
        organizationId: membership.organizationId,
        createdAt: {
          gte: startOfToday,
        },
      },
      _count: {
        id: true,
      },
    }),
  ]);

  const actionsByAgent = new Map(
    actionCounts.map((count) => [count.agentId, count._count.id]),
  );

  return NextResponse.json({
    agents: agents.map((agent) => ({
      ...agent,
      allowedTools: normalizeAllowedTools(agent.allowedToolsJson),
      actionsToday: actionsByAgent.get(agent.id) ?? 0,
      lastActivityAt: agent.actionRequests.at(0)?.createdAt ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const membership = await getApiAgentManagerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = agentInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const ownerUserId = await assertOwnerInOrganization(
      membership.organizationId,
      parsed.data.ownerUserId,
    );

    const agent = await prisma.agent.create({
      data: {
        organizationId: membership.organizationId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description?.trim() || null,
        department: parsed.data.department?.trim() || null,
        ownerUserId,
        status: parsed.data.status ?? AgentStatus.ACTIVE,
        riskTier: parsed.data.riskTier,
        allowedToolsJson: parsed.data.allowedTools,
      },
    });

    await createAuditLog({
      organizationId: membership.organizationId,
      actorType: "user",
      actorId: membership.userId,
      eventType: "agent.created",
      targetType: "Agent",
      targetId: agent.id,
      metadataJson: {
        name: agent.name,
        slug: agent.slug,
        status: agent.status,
        riskTier: agent.riskTier,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent creation failed" },
      { status: 400 },
    );
  }
}

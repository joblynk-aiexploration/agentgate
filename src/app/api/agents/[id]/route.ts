import { NextResponse } from "next/server";
import {
  assertOwnerInOrganization,
  getApiAgentManagerMembership,
  getApiAgentMembership,
  normalizeAllowedTools,
} from "@/lib/agents";
import { createAuditLog } from "@/server/audit/audit-service";
import { prisma } from "@/lib/prisma";
import { agentPatchSchema } from "@/lib/validators";

type AgentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: AgentRouteContext) {
  const membership = await getApiAgentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const agent = await prisma.agent.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      apiKeys: {
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          status: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      },
      actionRequests: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    agent: {
      ...agent,
      allowedTools: normalizeAllowedTools(agent.allowedToolsJson),
    },
  });
}

export async function PATCH(request: Request, context: AgentRouteContext) {
  const membership = await getApiAgentManagerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = agentPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.agent.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const ownerUserId =
      "ownerUserId" in parsed.data
        ? await assertOwnerInOrganization(
            membership.organizationId,
            parsed.data.ownerUserId,
          )
        : undefined;

    const agent = await prisma.agent.update({
      where: {
        id,
        organizationId: membership.organizationId,
      },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description:
          "description" in parsed.data
            ? parsed.data.description?.trim() || null
            : undefined,
        department:
          "department" in parsed.data
            ? parsed.data.department?.trim() || null
            : undefined,
        ownerUserId,
        status: parsed.data.status,
        riskTier: parsed.data.riskTier,
        allowedToolsJson: parsed.data.allowedTools,
      },
    });

    await createAuditLog({
      organizationId: membership.organizationId,
      actorType: "user",
      actorId: membership.userId,
      eventType: "agent.updated",
      targetType: "Agent",
      targetId: agent.id,
      metadataJson: {
        name: agent.name,
        slug: agent.slug,
        status: agent.status,
        riskTier: agent.riskTier,
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Agent update failed", error);

    return NextResponse.json(
      { error: "Agent update failed." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: AgentRouteContext) {
  const membership = await getApiAgentManagerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.agent.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.agent.delete({
    where: {
      id,
      organizationId: membership.organizationId,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "agent.deleted",
    targetType: "Agent",
    targetId: existing.id,
    metadataJson: {
      name: existing.name,
      slug: existing.slug,
    },
  });

  return NextResponse.json({ ok: true });
}

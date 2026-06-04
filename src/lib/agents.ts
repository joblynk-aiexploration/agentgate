import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  AgentStatus,
  type MembershipRole,
  type ToolType,
} from "@/generated/prisma/client";
import { createAuditLog } from "@/server/audit/audit-service";
import { getCurrentMembership } from "@/lib/auth";
import { hasRole, roleRules } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { agentInputSchema, agentPatchSchema } from "@/lib/validators";
import type { z } from "zod";

export type AgentInput = z.infer<typeof agentInputSchema>;
export type AgentPatchInput = z.infer<typeof agentPatchSchema>;

export type AgentMembership = NonNullable<Awaited<ReturnType<typeof getCurrentMembership>>>;

export function canManageAgents(role: MembershipRole) {
  return hasRole(role, roleRules.manageAgents);
}

export async function requireAgentViewer() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!hasRole(membership.role, roleRules.viewAgents)) {
    notFound();
  }

  return membership;
}

export async function requireAgentManager() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canManageAgents(membership.role)) {
    notFound();
  }

  return membership;
}

export async function getApiAgentMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !hasRole(membership.role, roleRules.viewAgents)) {
    return null;
  }

  return membership;
}

export async function getApiAgentManagerMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canManageAgents(membership.role)) {
    return null;
  }

  return membership;
}

function cleanOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export function normalizeAllowedTools(value: unknown): ToolType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ToolType => typeof item === "string") as ToolType[];
}

export async function assertOwnerInOrganization(
  organizationId: string,
  ownerUserId: string | null | undefined,
) {
  if (!ownerUserId) {
    return null;
  }

  const membership = await prisma.membership.findFirst({
    where: {
      organizationId,
      userId: ownerUserId,
    },
    select: {
      userId: true,
    },
  });

  if (!membership) {
    throw new Error("Owner must be a member of the current organization.");
  }

  return ownerUserId;
}

export async function getAgentOrThrow(organizationId: string, agentId: string) {
  const agent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      organizationId,
    },
  });

  if (!agent) {
    notFound();
  }

  return agent;
}

export async function createAgent(
  membership: AgentMembership,
  input: AgentInput,
) {
  const ownerUserId = await assertOwnerInOrganization(
    membership.organizationId,
    cleanOptionalString(input.ownerUserId),
  );

  const agent = await prisma.agent.create({
    data: {
      organizationId: membership.organizationId,
      name: input.name,
      slug: input.slug,
      description: cleanOptionalString(input.description),
      department: cleanOptionalString(input.department),
      ownerUserId,
      status: input.status,
      riskTier: input.riskTier,
      allowedToolsJson: input.allowedTools,
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

  revalidatePath("/agents");
  redirect(`/agents/${agent.id}`);
}

export async function updateAgent(
  membership: AgentMembership,
  agentId: string,
  input: AgentPatchInput,
) {
  await getAgentOrThrow(membership.organizationId, agentId);

  const ownerUserId =
    "ownerUserId" in input
      ? await assertOwnerInOrganization(
          membership.organizationId,
          cleanOptionalString(input.ownerUserId),
        )
      : undefined;

  const agent = await prisma.agent.update({
    where: {
      id: agentId,
      organizationId: membership.organizationId,
    },
    data: {
      name: input.name,
      slug: input.slug,
      description:
        "description" in input ? cleanOptionalString(input.description) : undefined,
      department:
        "department" in input ? cleanOptionalString(input.department) : undefined,
      ownerUserId,
      status: input.status,
      riskTier: input.riskTier,
      allowedToolsJson: input.allowedTools,
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

  revalidatePath("/agents");
  revalidatePath(`/agents/${agent.id}`);

  return agent;
}

export async function pauseAgent(membership: AgentMembership, agentId: string) {
  await getAgentOrThrow(membership.organizationId, agentId);

  const agent = await prisma.agent.update({
    where: {
      id: agentId,
      organizationId: membership.organizationId,
    },
    data: {
      status: AgentStatus.PAUSED,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "agent.paused",
    targetType: "Agent",
    targetId: agent.id,
    metadataJson: { name: agent.name },
  });

  revalidatePath("/agents");
  revalidatePath(`/agents/${agent.id}`);

  return agent;
}

export async function resumeAgent(membership: AgentMembership, agentId: string) {
  await getAgentOrThrow(membership.organizationId, agentId);

  const agent = await prisma.agent.update({
    where: {
      id: agentId,
      organizationId: membership.organizationId,
    },
    data: {
      status: AgentStatus.ACTIVE,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "agent.resumed",
    targetType: "Agent",
    targetId: agent.id,
    metadataJson: { name: agent.name },
  });

  revalidatePath("/agents");
  revalidatePath(`/agents/${agent.id}`);

  return agent;
}

export async function deleteAgent(membership: AgentMembership, agentId: string) {
  const agent = await getAgentOrThrow(membership.organizationId, agentId);

  await prisma.agent.delete({
    where: {
      id: agent.id,
      organizationId: membership.organizationId,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "agent.deleted",
    targetType: "Agent",
    targetId: agent.id,
    metadataJson: {
      name: agent.name,
      slug: agent.slug,
    },
  });

  revalidatePath("/agents");
  redirect("/agents");
}

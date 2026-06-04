import { revalidatePath } from "next/cache";
import {
  ApiKeyStatus,
  type MembershipRole,
} from "@/generated/prisma/client";
import { createAuditLog } from "@/server/audit/audit-service";
import { getCurrentMembership } from "@/lib/auth";
import { generateApiKeyMaterial } from "@/lib/crypto";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { apiKeyCreateSchema } from "@/lib/validators";
import type { z } from "zod";

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;

export type ApiKeyMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;

const apiKeyViewRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
  "auditor",
];

const apiKeyCreateRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "developer",
];

const apiKeyRevokeRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
];

export function canViewApiKeys(role: MembershipRole) {
  return hasRole(role, apiKeyViewRoles);
}

export function canCreateApiKeys(role: MembershipRole) {
  return hasRole(role, apiKeyCreateRoles);
}

export function canRevokeApiKeys(role: MembershipRole) {
  return hasRole(role, apiKeyRevokeRoles);
}

export async function getApiKeyViewerMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canViewApiKeys(membership.role)) {
    return null;
  }

  return membership;
}

export async function getApiKeyCreatorMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canCreateApiKeys(membership.role)) {
    return null;
  }

  return membership;
}

export async function getApiKeyRevokerMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canRevokeApiKeys(membership.role)) {
    return null;
  }

  return membership;
}

export async function assertAgentScope(
  organizationId: string,
  agentId: string | null | undefined,
) {
  if (!agentId) {
    return null;
  }

  const agent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      organizationId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!agent) {
    throw new Error("Agent scope must belong to the current organization.");
  }

  return agent;
}

export async function createApiKey(
  membership: ApiKeyMembership,
  input: ApiKeyCreateInput,
) {
  const agent = await assertAgentScope(membership.organizationId, input.agentId);
  const material = generateApiKeyMaterial();

  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId: membership.organizationId,
      agentId: agent?.id ?? null,
      createdById: membership.userId,
      name: input.name,
      keyPrefix: material.keyPrefix,
      keyHash: material.keyHash,
      status: ApiKeyStatus.ACTIVE,
      expiresAt: input.expiresAt,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      status: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      agent: {
        select: {
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
    eventType: "api_key.created",
    targetType: "ApiKey",
    targetId: apiKey.id,
    metadataJson: {
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      agentId: apiKey.agent?.id ?? null,
    },
  });

  revalidatePath("/developer/api-keys");

  return {
    apiKey,
    fullKey: material.fullKey,
  };
}

export async function revokeApiKey(
  membership: ApiKeyMembership,
  apiKeyId: string,
) {
  const existing = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      organizationId: membership.organizationId,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      status: true,
    },
  });

  if (!existing) {
    throw new Error("API key not found.");
  }

  const apiKey = await prisma.apiKey.update({
    where: {
      id: existing.id,
      organizationId: membership.organizationId,
    },
    data: {
      status: ApiKeyStatus.REVOKED,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      status: true,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "api_key.revoked",
    targetType: "ApiKey",
    targetId: apiKey.id,
    metadataJson: {
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      previousStatus: existing.status,
    },
  });

  revalidatePath("/developer/api-keys");

  return apiKey;
}

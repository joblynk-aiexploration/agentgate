import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { MembershipRole, Prisma } from "@/generated/prisma/client";
import { createAuditLog } from "@/server/audit/audit-service";
import { getCurrentMembership } from "@/lib/auth";
import { hasRole, roleRules } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { policyInputSchema, policyPatchSchema } from "@/lib/validators";
import type { z } from "zod";

export type PolicyInput = z.infer<typeof policyInputSchema>;
export type PolicyPatchInput = z.infer<typeof policyPatchSchema>;
export type PolicyMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;

export function canManagePolicies(role: MembershipRole) {
  return hasRole(role, roleRules.managePolicies);
}

export function canViewPolicies(role: MembershipRole) {
  return hasRole(role, [
    "platform_owner",
    "org_owner",
    "security_admin",
    "developer",
    "reviewer",
    "auditor",
  ]);
}

export async function requirePolicyViewer() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canViewPolicies(membership.role)) {
    notFound();
  }

  return membership;
}

export async function requirePolicyManager() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canManagePolicies(membership.role)) {
    notFound();
  }

  return membership;
}

export async function getApiPolicyMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canViewPolicies(membership.role)) {
    return null;
  }

  return membership;
}

export async function getApiPolicyManagerMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canManagePolicies(membership.role)) {
    return null;
  }

  return membership;
}

function cleanOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function normalizeRule(rule: PolicyInput["rules"][number]) {
  return {
    tool: rule.tool || null,
    action: cleanOptionalString(rule.action),
    decision: rule.decision,
    requiredRole: rule.requiredRole || null,
    riskOverride: rule.riskOverride || null,
    conditionsJson: toJsonValue(rule.conditionsJson),
  };
}

export async function getPolicyOrThrow(organizationId: string, policyId: string) {
  const policy = await prisma.policy.findFirst({
    where: {
      id: policyId,
      organizationId,
    },
    include: {
      createdBy: {
        select: {
          email: true,
          name: true,
        },
      },
      rules: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!policy) {
    notFound();
  }

  return policy;
}

export async function createPolicy(
  membership: PolicyMembership,
  input: PolicyInput,
) {
  const policy = await prisma.$transaction(async (tx) =>
    tx.policy.create({
      data: {
        organizationId: membership.organizationId,
        createdById: membership.userId,
        name: input.name,
        description: cleanOptionalString(input.description),
        status: input.status,
        priority: input.priority,
        rules: {
          create: input.rules.map((rule) => ({
            organizationId: membership.organizationId,
            ...normalizeRule(rule),
          })),
        },
      },
      include: {
        rules: true,
      },
    }),
  );

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "policy.created",
    targetType: "Policy",
    targetId: policy.id,
    metadataJson: {
      name: policy.name,
      status: policy.status,
      priority: policy.priority,
      rulesCount: policy.rules.length,
    },
  });

  revalidatePath("/policies");

  return policy;
}

export async function updatePolicy(
  membership: PolicyMembership,
  policyId: string,
  input: PolicyPatchInput,
) {
  await getPolicyOrThrow(membership.organizationId, policyId);

  const policy = await prisma.$transaction(async (tx) => {
    if (input.rules) {
      await tx.policyRule.deleteMany({
        where: {
          organizationId: membership.organizationId,
          policyId,
        },
      });
    }

    return tx.policy.update({
      where: {
        id: policyId,
        organizationId: membership.organizationId,
      },
      data: {
        name: input.name,
        description:
          "description" in input ? cleanOptionalString(input.description) : undefined,
        status: input.status,
        priority: input.priority,
        rules: input.rules
          ? {
              create: input.rules.map((rule) => ({
                organizationId: membership.organizationId,
                ...normalizeRule(rule),
              })),
            }
          : undefined,
      },
      include: {
        rules: true,
      },
    });
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "policy.updated",
    targetType: "Policy",
    targetId: policy.id,
    metadataJson: {
      name: policy.name,
      status: policy.status,
      priority: policy.priority,
      rulesCount: policy.rules.length,
    },
  });

  revalidatePath("/policies");
  revalidatePath(`/policies/${policy.id}`);

  return policy;
}

export async function deletePolicy(
  membership: PolicyMembership,
  policyId: string,
) {
  const existing = await getPolicyOrThrow(membership.organizationId, policyId);

  await prisma.policy.delete({
    where: {
      id: existing.id,
      organizationId: membership.organizationId,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "policy.deleted",
    targetType: "Policy",
    targetId: existing.id,
    metadataJson: {
      name: existing.name,
      status: existing.status,
      priority: existing.priority,
      rulesCount: existing.rules.length,
    },
  });

  revalidatePath("/policies");
}

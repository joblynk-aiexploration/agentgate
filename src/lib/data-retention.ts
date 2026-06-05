import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { MembershipRole } from "@/generated/prisma/client";
import { createAuditLog } from "@/server/audit/audit-service";
import { getCurrentMembership } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { dataRetentionSettingsSchema } from "@/lib/validators";
import type { z } from "zod";

export type DataRetentionMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;
export type DataRetentionSettingsInput = z.infer<
  typeof dataRetentionSettingsSchema
>;

const dataRetentionManagerRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
];

export function canManageDataRetention(role: MembershipRole) {
  return hasRole(role, dataRetentionManagerRoles);
}

export async function requireDataRetentionManager() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canManageDataRetention(membership.role)) {
    notFound();
  }

  return membership;
}

export async function getApiDataRetentionMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canManageDataRetention(membership.role)) {
    return null;
  }

  return membership;
}

export async function getOrCreateDataRetentionSettings(
  organizationId: string,
) {
  return prisma.organizationSettings.upsert({
    where: {
      organizationId,
    },
    update: {},
    create: {
      organizationId,
    },
  });
}

function cutoffDate(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getDataRetentionDryRun(membership: DataRetentionMembership) {
  const settings = await getOrCreateDataRetentionSettings(membership.organizationId);
  const auditCutoff = cutoffDate(settings.auditLogRetentionDays);
  const actionCutoff = cutoffDate(settings.actionRetentionDays);
  const approvalCutoff = cutoffDate(settings.approvalRetentionDays);

  const [auditLogs, actionRequests, approvalRequests] = await Promise.all([
    prisma.auditLog.count({
      where: {
        organizationId: membership.organizationId,
        createdAt: {
          lt: auditCutoff,
        },
      },
    }),
    prisma.actionRequest.count({
      where: {
        organizationId: membership.organizationId,
        createdAt: {
          lt: actionCutoff,
        },
      },
    }),
    prisma.approvalRequest.count({
      where: {
        organizationId: membership.organizationId,
        createdAt: {
          lt: approvalCutoff,
        },
      },
    }),
  ]);

  return {
    cutoffs: {
      auditLogs: auditCutoff,
      actionRequests: actionCutoff,
      approvalRequests: approvalCutoff,
    },
    counts: {
      auditLogs,
      actionRequests,
      approvalRequests,
    },
    settings,
  };
}

export async function updateDataRetentionSettings(
  membership: DataRetentionMembership,
  input: DataRetentionSettingsInput,
) {
  if (!canManageDataRetention(membership.role)) {
    throw new Error("You are not allowed to manage data retention.");
  }

  const settings = await prisma.organizationSettings.upsert({
    where: {
      organizationId: membership.organizationId,
    },
    update: input,
    create: {
      organizationId: membership.organizationId,
      ...input,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "data_retention.settings_updated",
    targetType: "OrganizationSettings",
    targetId: settings.id,
    metadata: {
      auditLogRetentionDays: settings.auditLogRetentionDays,
      actionRetentionDays: settings.actionRetentionDays,
      approvalRetentionDays: settings.approvalRetentionDays,
    },
  });

  revalidatePath("/settings/data-retention");

  return settings;
}

export async function cleanupDataRetentionRecords(
  membership: DataRetentionMembership,
  options: { confirm: boolean },
) {
  if (!canManageDataRetention(membership.role)) {
    throw new Error("You are not allowed to run data retention cleanup.");
  }

  const dryRun = await getDataRetentionDryRun(membership);

  if (!options.confirm) {
    await createAuditLog({
      organizationId: membership.organizationId,
      actorType: "user",
      actorId: membership.userId,
      eventType: "data_retention.cleanup_dry_run",
      targetType: "Organization",
      targetId: membership.organizationId,
      metadata: {
        counts: dryRun.counts,
        cutoffs: {
          auditLogs: dryRun.cutoffs.auditLogs.toISOString(),
          actionRequests: dryRun.cutoffs.actionRequests.toISOString(),
          approvalRequests: dryRun.cutoffs.approvalRequests.toISOString(),
        },
      },
    });

    return {
      ...dryRun,
      deleted: {
        auditLogs: 0,
        actionRequests: 0,
        approvalRequests: 0,
      },
      executed: false,
    };
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const approvalRequests = await tx.approvalRequest.deleteMany({
      where: {
        organizationId: membership.organizationId,
        createdAt: {
          lt: dryRun.cutoffs.approvalRequests,
        },
      },
    });
    const actionRequests = await tx.actionRequest.deleteMany({
      where: {
        organizationId: membership.organizationId,
        createdAt: {
          lt: dryRun.cutoffs.actionRequests,
        },
      },
    });
    const auditLogs = await tx.auditLog.deleteMany({
      where: {
        organizationId: membership.organizationId,
        createdAt: {
          lt: dryRun.cutoffs.auditLogs,
        },
      },
    });

    return {
      approvalRequests: approvalRequests.count,
      actionRequests: actionRequests.count,
      auditLogs: auditLogs.count,
    };
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "data_retention.cleanup_run",
    targetType: "Organization",
    targetId: membership.organizationId,
    metadata: {
      deleted,
      dryRunCounts: dryRun.counts,
      cutoffs: {
        auditLogs: dryRun.cutoffs.auditLogs.toISOString(),
        actionRequests: dryRun.cutoffs.actionRequests.toISOString(),
        approvalRequests: dryRun.cutoffs.approvalRequests.toISOString(),
      },
    },
  });

  revalidatePath("/settings/data-retention");
  revalidatePath("/audit-logs");
  revalidatePath("/actions");
  revalidatePath("/approvals");

  return {
    ...dryRun,
    deleted,
    executed: true,
  };
}

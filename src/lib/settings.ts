import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { MembershipRole } from "@/generated/prisma/client";
import { getCurrentMembership } from "@/lib/auth";
import { createRoleNotifications } from "@/lib/notifications";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { hasRole, roleRules } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { settingsUpdateSchema } from "@/lib/validators";
import { createAuditLog } from "@/server/audit/audit-service";
import type { z } from "zod";

export type SettingsMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

export function canManageOrganizationSettings(role: MembershipRole) {
  return hasRole(role, roleRules.manageOrganization);
}

export function canManageKillSwitch(role: MembershipRole) {
  return hasRole(role, roleRules.manageKillSwitch);
}

export async function requireSettingsViewer() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  return membership;
}

export async function getApiSettingsMembership() {
  return getCurrentMembership();
}

export async function requireOrganizationSettingsManager() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canManageOrganizationSettings(membership.role)) {
    notFound();
  }

  return membership;
}

export async function updateOrganizationSettings(
  membership: SettingsMembership,
  input: SettingsUpdateInput,
) {
  if (!canManageOrganizationSettings(membership.role)) {
    throw new Error("You are not allowed to update organization settings.");
  }

  if (input.aiReviewerMode && input.aiReviewerMode !== "LOCAL_RULES_ONLY") {
    throw new Error("V1 only supports local rules for AI reviewer mode.");
  }

  const organization = await prisma.organization.update({
    where: {
      id: membership.organizationId,
    },
    data: {
      name: input.name,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      killSwitchEnabled: true,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "organization.settings_updated",
    targetType: "Organization",
    targetId: organization.id,
    metadata: {
      name: organization.name,
      aiReviewerMode: "LOCAL_RULES_ONLY",
    },
  });

  revalidatePath("/settings");

  return organization;
}

export async function setOrganizationKillSwitch(
  membership: SettingsMembership,
  enabled: boolean,
) {
  if (!canManageKillSwitch(membership.role)) {
    throw new Error("You are not allowed to manage the kill switch.");
  }

  const organization = await prisma.organization.update({
    where: {
      id: membership.organizationId,
    },
    data: {
      killSwitchEnabled: enabled,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      killSwitchEnabled: true,
      status: true,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: enabled
      ? "organization.kill_switch_enabled"
      : "organization.kill_switch_disabled",
    targetType: "Organization",
    targetId: organization.id,
    metadata: {
      name: organization.name,
      slug: organization.slug,
      killSwitchEnabled: organization.killSwitchEnabled,
    },
  });

  if (enabled) {
    await createRoleNotifications(
      membership.organizationId,
      ["org_owner", "security_admin"],
      {
        type: "organization.kill_switch_enabled",
        title: "Organization kill switch enabled",
        body: `${organization.name} will now block incoming gateway actions.`,
        metadataJson: {
          organizationId: organization.id,
          slug: organization.slug,
          killSwitchEnabled: organization.killSwitchEnabled,
        },
      },
    );

    await dispatchWebhookEvent({
      organizationId: membership.organizationId,
      event: "organization.kill_switch_enabled",
      targetType: "Organization",
      targetId: organization.id,
      metadata: {
        name: organization.name,
        slug: organization.slug,
        enabledById: membership.userId,
      },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return organization;
}

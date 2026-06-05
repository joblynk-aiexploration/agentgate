import { notFound } from "next/navigation";
import type { MembershipRole } from "@/generated/prisma/client";
import { requireMembership } from "@/lib/auth";

const roleLevels: Record<MembershipRole, number> = {
  platform_owner: 100,
  org_owner: 90,
  security_admin: 70,
  developer: 50,
  reviewer: 40,
  auditor: 20,
};

export const roleRules = {
  manageOrganization: ["platform_owner", "org_owner"],
  manageAgents: ["platform_owner", "org_owner", "security_admin"],
  viewAgents: [
    "platform_owner",
    "org_owner",
    "security_admin",
    "developer",
    "reviewer",
    "auditor",
  ],
  managePolicies: ["platform_owner", "org_owner", "security_admin"],
  manageApprovals: ["platform_owner", "org_owner", "security_admin", "reviewer"],
  viewAuditLogs: ["platform_owner", "org_owner", "security_admin", "auditor"],
  manageKillSwitch: ["platform_owner", "org_owner", "security_admin"],
  manageApiKeys: ["platform_owner", "org_owner", "developer"],
  viewMembers: ["platform_owner", "org_owner", "security_admin", "auditor"],
  manageMembers: ["platform_owner", "org_owner"],
  viewDeveloperDocs: ["platform_owner", "org_owner", "security_admin", "developer"],
  viewReports: ["platform_owner", "org_owner", "security_admin", "auditor"],
  manageBilling: ["platform_owner", "org_owner"],
} satisfies Record<string, MembershipRole[]>;

export function hasRole(
  actualRole: MembershipRole,
  allowedRoles: MembershipRole | MembershipRole[],
) {
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return allowed.includes(actualRole);
}

export function hasMinimumRole(actualRole: MembershipRole, requiredRole: MembershipRole) {
  return roleLevels[actualRole] >= roleLevels[requiredRole];
}

export async function requireRole(allowedRoles: MembershipRole | MembershipRole[]) {
  const membership = await requireMembership();

  if (!hasRole(membership.role, allowedRoles)) {
    notFound();
  }

  return membership;
}

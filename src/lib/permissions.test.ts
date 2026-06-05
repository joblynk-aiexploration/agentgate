import { describe, expect, it, vi } from "vitest";
import { MembershipRole } from "@/generated/prisma/client";
import {
  hasRole,
  roleRules,
} from "@/lib/permissions";
import { hasCapability, rolesForCapability } from "@/lib/rbac";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/server/audit/audit-service", () => ({
  createAuditLog: vi.fn(),
}));

describe("permission helpers", () => {
  it("allows org_owner to manage agents", () => {
    expect(hasRole(MembershipRole.org_owner, roleRules.manageAgents)).toBe(true);
    expect(hasCapability(MembershipRole.org_owner, "manage_agents")).toBe(true);
  });

  it("allows developer to manage API keys", () => {
    expect(hasRole(MembershipRole.developer, roleRules.manageApiKeys)).toBe(true);
    expect(hasCapability(MembershipRole.developer, "manage_api_keys")).toBe(true);
  });

  it("keeps auditor read-only for mutating areas", () => {
    expect(hasRole(MembershipRole.auditor, roleRules.manageAgents)).toBe(false);
    expect(hasRole(MembershipRole.auditor, roleRules.manageApiKeys)).toBe(false);
    expect(hasRole(MembershipRole.auditor, roleRules.managePolicies)).toBe(false);
    expect(hasRole(MembershipRole.auditor, roleRules.viewAuditLogs)).toBe(true);
    expect(hasCapability(MembershipRole.auditor, "manage_agents")).toBe(false);
    expect(hasCapability(MembershipRole.auditor, "manage_api_keys")).toBe(false);
    expect(hasCapability(MembershipRole.auditor, "manage_policies")).toBe(false);
    expect(hasCapability(MembershipRole.auditor, "view_audit_logs")).toBe(true);
    expect(hasCapability(MembershipRole.auditor, "export_audit_logs")).toBe(true);
  });

  it("allows a reviewer to approve eligible approvals", async () => {
    const { canActOnApproval } = await import("@/lib/approvals");

    expect(
      canActOnApproval(
        {
          role: MembershipRole.reviewer,
          userId: "user_reviewer",
        },
        {
          assignedToId: null,
          requiredRole: MembershipRole.reviewer,
        },
      ),
    ).toBe(true);
  });

  it("keeps the RBAC matrix explicit for important access review rows", () => {
    expect(rolesForCapability("toggle_kill_switch")).toEqual([
      MembershipRole.org_owner,
      MembershipRole.security_admin,
      MembershipRole.platform_owner,
    ]);
    expect(rolesForCapability("revoke_api_keys")).toEqual([
      MembershipRole.org_owner,
      MembershipRole.security_admin,
      MembershipRole.developer,
      MembershipRole.platform_owner,
    ]);
    expect(hasCapability(MembershipRole.reviewer, "approve_approvals")).toBe(true);
    expect(hasCapability(MembershipRole.reviewer, "view_audit_logs")).toBe(false);
  });
});

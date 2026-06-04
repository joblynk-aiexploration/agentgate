import { describe, expect, it, vi } from "vitest";
import { MembershipRole } from "@/generated/prisma/client";
import {
  hasRole,
  roleRules,
} from "@/lib/permissions";

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
  });

  it("allows developer to manage API keys", () => {
    expect(hasRole(MembershipRole.developer, roleRules.manageApiKeys)).toBe(true);
  });

  it("keeps auditor read-only for mutating areas", () => {
    expect(hasRole(MembershipRole.auditor, roleRules.manageAgents)).toBe(false);
    expect(hasRole(MembershipRole.auditor, roleRules.manageApiKeys)).toBe(false);
    expect(hasRole(MembershipRole.auditor, roleRules.managePolicies)).toBe(false);
    expect(hasRole(MembershipRole.auditor, roleRules.viewAuditLogs)).toBe(true);
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
});

import { describe, expect, it } from "vitest";
import {
  ActionDecision,
  ActionStatus,
} from "@/generated/prisma/client";
import { mapGatewayDecisionToStatus } from "@/server/gateway/decision";

describe("gateway decision mapping", () => {
  it("allows ALLOW decisions without approval", () => {
    expect(
      mapGatewayDecisionToStatus(ActionDecision.ALLOW, {
        environment: "production",
      }),
    ).toEqual({
      allowed: true,
      requiresApproval: false,
      status: ActionStatus.ALLOWED,
    });
  });

  it("holds REQUIRE_APPROVAL decisions pending", () => {
    expect(
      mapGatewayDecisionToStatus(ActionDecision.REQUIRE_APPROVAL, {
        environment: "production",
      }),
    ).toEqual({
      allowed: false,
      requiresApproval: true,
      status: ActionStatus.PENDING_APPROVAL,
    });
  });

  it("blocks BLOCK decisions", () => {
    expect(
      mapGatewayDecisionToStatus(ActionDecision.BLOCK, {
        environment: "production",
      }),
    ).toEqual({
      allowed: false,
      requiresApproval: false,
      status: ActionStatus.BLOCKED,
    });
  });

  it("allows sandbox-only decisions outside production", () => {
    expect(
      mapGatewayDecisionToStatus(ActionDecision.SANDBOX_ONLY, {
        environment: "sandbox",
      }),
    ).toEqual({
      allowed: true,
      requiresApproval: false,
      status: ActionStatus.ALLOWED,
    });
  });

  it("blocks sandbox-only decisions in production", () => {
    expect(
      mapGatewayDecisionToStatus(ActionDecision.SANDBOX_ONLY, {
        environment: "production",
      }),
    ).toEqual({
      allowed: false,
      requiresApproval: false,
      status: ActionStatus.BLOCKED,
    });
  });
});

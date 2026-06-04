import { describe, expect, it } from "vitest";
import {
  ActionDecision,
  AgentRiskTier,
  AgentStatus,
  MembershipRole,
  OrganizationStatus,
  PolicyStatus,
  RiskLevel,
  ToolConnectionStatus,
  ToolType,
} from "@/generated/prisma/client";
import { PolicyEngine } from "@/server/policies/policy-engine";
import type {
  PolicyEvaluationInput,
  PolicyForEvaluation,
} from "@/server/policies/types";

const engine = new PolicyEngine();

const policies: PolicyForEvaluation[] = [
  {
    id: "policy_refunds",
    name: "Refunds above $500 require approval",
    status: PolicyStatus.ACTIVE,
    priority: 10,
    rules: [
      {
        id: "rule_refunds",
        policyId: "policy_refunds",
        tool: ToolType.STRIPE,
        action: "refund.create",
        conditionsJson: {
          amountGreaterThan: 500,
        },
        decision: ActionDecision.REQUIRE_APPROVAL,
        requiredRole: MembershipRole.reviewer,
      },
    ],
  },
  {
    id: "policy_delete",
    name: "Delete actions are blocked",
    status: PolicyStatus.ACTIVE,
    priority: 20,
    rules: [
      {
        id: "rule_delete",
        policyId: "policy_delete",
        conditionsJson: {
          actionContains: "delete",
        },
        decision: ActionDecision.BLOCK,
      },
    ],
  },
  {
    id: "policy_slack",
    name: "Internal Slack notifications are allowed",
    status: PolicyStatus.ACTIVE,
    priority: 30,
    rules: [
      {
        id: "rule_slack",
        policyId: "policy_slack",
        tool: ToolType.SLACK,
        action: "message.send",
        conditionsJson: {
          externalCommunication: false,
        },
        decision: ActionDecision.ALLOW,
      },
    ],
  },
];

function input(overrides: Partial<PolicyEvaluationInput>): PolicyEvaluationInput {
  return {
    organization: {
      id: "org_1",
      status: OrganizationStatus.ACTIVE,
      killSwitchEnabled: false,
    },
    agent: {
      id: "agent_1",
      status: AgentStatus.ACTIVE,
      riskTier: AgentRiskTier.STANDARD,
    },
    toolConnection: {
      toolType: ToolType.STRIPE,
      status: ToolConnectionStatus.DEMO,
    },
    policies,
    tool: ToolType.STRIPE,
    action: "refund.create",
    environment: "production",
    amount: 1200,
    currency: "USD",
    externalCommunication: true,
    productionEnvironment: true,
    payload: {},
    metadata: {},
    riskResult: {
      score: 20,
      level: RiskLevel.LOW,
      signals: [],
      explanation: "Low risk for policy test.",
      modelVersion: "rules-v1",
    },
    ...overrides,
  };
}

describe("PolicyEngine", () => {
  it("requires approval for refunds over $500", async () => {
    const result = await engine.evaluate(input({}));

    expect(result.decision).toBe(ActionDecision.REQUIRE_APPROVAL);
    expect(result.requiresApproval).toBe(true);
    expect(result.requiredRole).toBe(MembershipRole.reviewer);
    expect(result.matchedPolicyRuleId).toBe("rule_refunds");
  });

  it("blocks delete actions", async () => {
    const result = await engine.evaluate(
      input({
        tool: ToolType.CUSTOM,
        action: "customer.delete",
        amount: null,
      }),
    );

    expect(result.decision).toBe(ActionDecision.BLOCK);
    expect(result.allowed).toBe(false);
    expect(result.matchedPolicyRuleId).toBe("rule_delete");
  });

  it("allows internal Slack notifications", async () => {
    const result = await engine.evaluate(
      input({
        tool: ToolType.SLACK,
        action: "message.send",
        amount: null,
        externalCommunication: false,
        productionEnvironment: false,
      }),
    );

    expect(result.decision).toBe(ActionDecision.ALLOW);
    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(false);
  });

  it("blocks paused agents before policy matching", async () => {
    const result = await engine.evaluate(
      input({
        agent: {
          id: "agent_1",
          status: AgentStatus.PAUSED,
          riskTier: AgentRiskTier.HIGH,
        },
      }),
    );

    expect(result.decision).toBe(ActionDecision.BLOCK);
    expect(result.reason).toBe("Agent is paused by admin kill switch.");
  });

  it("blocks organization kill switch before policy matching", async () => {
    const result = await engine.evaluate(
      input({
        organization: {
          id: "org_1",
          status: OrganizationStatus.ACTIVE,
          killSwitchEnabled: true,
        },
      }),
    );

    expect(result.decision).toBe(ActionDecision.BLOCK);
    expect(result.reason).toBe("Organization-level kill switch is active.");
  });
});

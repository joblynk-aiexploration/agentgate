import {
  ActionDecision,
  AgentRiskTier,
  AgentStatus,
  MembershipRole,
  OrganizationStatus,
  PolicyStatus,
  RiskLevel,
  ToolType,
} from "../src/generated/prisma/client";
import { PolicyEngine } from "../src/server/policies/policy-engine";
import type { PolicyForEvaluation } from "../src/server/policies/types";

const engine = new PolicyEngine();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const baseOrganization = {
  id: "org_demo",
  name: "Acme AI Operations",
  status: OrganizationStatus.ACTIVE,
  killSwitchEnabled: false,
};

const baseAgent = {
  id: "agent_support_refund",
  name: "Support Refund Agent",
  department: "Support",
  status: AgentStatus.ACTIVE,
  riskTier: AgentRiskTier.HIGH,
};

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
        conditionsJson: {
          tool: "stripe",
          action: "refund.create",
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
    id: "policy_customer_email",
    name: "External customer emails require approval",
    status: PolicyStatus.ACTIVE,
    priority: 30,
    rules: [
      {
        id: "rule_customer_email",
        policyId: "policy_customer_email",
        conditionsJson: {
          tool: "email_preview",
          externalCommunication: true,
        },
        decision: ActionDecision.REQUIRE_APPROVAL,
      },
    ],
  },
  {
    id: "policy_slack",
    name: "Internal Slack notifications are allowed",
    status: PolicyStatus.ACTIVE,
    priority: 40,
    rules: [
      {
        id: "rule_slack",
        policyId: "policy_slack",
        conditionsJson: {
          tool: "slack",
        },
        decision: ActionDecision.ALLOW,
      },
    ],
  },
  {
    id: "policy_database_write",
    name: "Production database writes require approval",
    status: PolicyStatus.ACTIVE,
    priority: 50,
    rules: [
      {
        id: "rule_database_write",
        policyId: "policy_database_write",
        conditionsJson: {
          tool: "postgres",
          environment: "production",
          actionContains: ["write", "update", "insert"],
        },
        decision: ActionDecision.REQUIRE_APPROVAL,
      },
    ],
  },
];

async function main() {
  const refund = await engine.evaluate({
    organization: baseOrganization,
    agent: baseAgent,
    policies,
    tool: ToolType.STRIPE,
    action: "refund.create",
    environment: "production",
    amount: 1200,
    currency: "USD",
    externalCommunication: false,
    productionEnvironment: true,
    reversible: false,
    riskResult: {
      score: 95,
      level: RiskLevel.CRITICAL,
      signals: ["money_involved", "payment_refund_action", "production_environment"],
      explanation: "Demo risk result",
      modelVersion: "rules-v1",
    },
  });

  assert(
    refund.decision === ActionDecision.REQUIRE_APPROVAL,
    `Expected refund to require approval, got ${refund.decision}`,
  );
  assert(
    refund.requiredRole === MembershipRole.reviewer,
    `Expected refund requiredRole reviewer, got ${refund.requiredRole}`,
  );

  const customerDelete = await engine.evaluate({
    organization: baseOrganization,
    agent: baseAgent,
    policies,
    tool: ToolType.CUSTOM,
    action: "customer.delete",
    environment: "production",
    productionEnvironment: true,
  });

  assert(
    customerDelete.decision === ActionDecision.BLOCK,
    `Expected delete to block, got ${customerDelete.decision}`,
  );

  const slack = await engine.evaluate({
    organization: baseOrganization,
    agent: baseAgent,
    policies,
    tool: ToolType.SLACK,
    action: "message.send",
    environment: "internal",
    externalCommunication: false,
    productionEnvironment: false,
  });

  assert(
    slack.decision === ActionDecision.ALLOW,
    `Expected Slack notification to allow, got ${slack.decision}`,
  );
  assert(slack.allowed, "Expected Slack notification to be allowed");

  const paused = await engine.evaluate({
    organization: baseOrganization,
    agent: {
      ...baseAgent,
      status: AgentStatus.PAUSED,
    },
    policies,
    tool: ToolType.SLACK,
    action: "message.send",
    environment: "internal",
  });

  assert(
    paused.decision === ActionDecision.BLOCK,
    `Expected paused agent to block, got ${paused.decision}`,
  );
  assert(
    paused.reason === "Agent is paused by admin kill switch.",
    `Unexpected paused reason: ${paused.reason}`,
  );

  const databaseWrite = await engine.evaluate({
    organization: baseOrganization,
    agent: baseAgent,
    policies,
    tool: ToolType.POSTGRES,
    action: "query.write.update",
    environment: "production",
    productionEnvironment: true,
  });

  assert(
    databaseWrite.decision === ActionDecision.REQUIRE_APPROVAL,
    `Expected database write to require approval, got ${databaseWrite.decision}`,
  );

  const organizationKillSwitch = await engine.evaluate({
    organization: {
      ...baseOrganization,
      killSwitchEnabled: true,
    },
    agent: baseAgent,
    policies,
    tool: ToolType.SLACK,
    action: "message.send",
  });

  assert(
    organizationKillSwitch.decision === ActionDecision.BLOCK,
    `Expected organization kill switch to block, got ${organizationKillSwitch.decision}`,
  );
  assert(
    organizationKillSwitch.reason === "Organization-level kill switch is active.",
    `Unexpected kill switch reason: ${organizationKillSwitch.reason}`,
  );

  console.log("Policy engine verification passed.");
  console.log({
    customerDelete,
    databaseWrite,
    organizationKillSwitch,
    paused,
    refund,
    slack,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

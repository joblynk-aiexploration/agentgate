import {
  ActionDecision,
  MembershipRole,
  PolicyStatus,
  RiskLevel,
  ToolType,
} from "@/generated/prisma/client";
import type { PolicyInput } from "@/lib/policies";

export const policyTemplateIdValues = [
  "refunds-above-500-approval",
  "refunds-above-1000-critical",
  "delete-customer-data-blocked",
  "external-customer-emails-approval",
  "internal-slack-allowed",
  "production-database-writes-approval",
  "webhook-production-triggers-approval",
  "high-risk-agents-production-approval",
  "critical-agents-destructive-blocked",
  "sensitive-data-security-admin-approval",
] as const;

export type PolicyTemplateId = (typeof policyTemplateIdValues)[number];

export type PolicyTemplate = {
  id: PolicyTemplateId;
  category: string;
  summary: string;
  policy: PolicyInput;
};

export const policyTemplates = [
  {
    id: "refunds-above-500-approval",
    category: "Payments",
    summary: "Route production Stripe refunds above the V1 threshold to reviewers.",
    policy: {
      name: "Refunds above $500 require approval",
      description: "Production refunds above $500 require reviewer approval before simulated execution.",
      status: PolicyStatus.ACTIVE,
      priority: 10,
      rules: [
        {
          tool: ToolType.STRIPE,
          action: "refund.create",
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.reviewer,
          riskOverride: RiskLevel.HIGH,
          conditionsJson: {
            amountGreaterThan: 500,
            currency: "USD",
            productionEnvironment: true,
          },
        },
      ],
    },
  },
  {
    id: "refunds-above-1000-critical",
    category: "Payments",
    summary: "Escalate large production refunds as critical reviewer decisions.",
    policy: {
      name: "Refunds above $1,000 are critical",
      description: "Large production refunds are marked critical and require security review.",
      status: PolicyStatus.ACTIVE,
      priority: 8,
      rules: [
        {
          tool: ToolType.STRIPE,
          action: "refund.create",
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.security_admin,
          riskOverride: RiskLevel.CRITICAL,
          conditionsJson: {
            amountGreaterThan: 1000,
            currency: "USD",
            productionEnvironment: true,
          },
        },
      ],
    },
  },
  {
    id: "delete-customer-data-blocked",
    category: "Data safety",
    summary: "Block destructive customer-data actions by default.",
    policy: {
      name: "Delete customer data is blocked",
      description: "Customer deletion actions are blocked in V1 unless a future policy explicitly changes the workflow.",
      status: PolicyStatus.ACTIVE,
      priority: 5,
      rules: [
        {
          tool: null,
          action: null,
          decision: ActionDecision.BLOCK,
          requiredRole: null,
          riskOverride: RiskLevel.CRITICAL,
          conditionsJson: {
            actionContains: ["delete", "destroy", "remove"],
            dataSensitivity: "customer",
          },
        },
      ],
    },
  },
  {
    id: "external-customer-emails-approval",
    category: "Communications",
    summary: "Require review before customer-facing email previews can execute.",
    policy: {
      name: "External customer emails require approval",
      description: "External customer emails must be reviewed before the V1 email preview executor simulates delivery.",
      status: PolicyStatus.ACTIVE,
      priority: 30,
      rules: [
        {
          tool: ToolType.EMAIL_PREVIEW,
          action: null,
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.reviewer,
          riskOverride: RiskLevel.MEDIUM,
          conditionsJson: {
            externalCommunication: true,
          },
        },
      ],
    },
  },
  {
    id: "internal-slack-allowed",
    category: "Communications",
    summary: "Allow low-risk internal Slack notifications.",
    policy: {
      name: "Internal Slack messages are allowed",
      description: "Internal Slack demo messages can proceed without approval when no external communication is involved.",
      status: PolicyStatus.ACTIVE,
      priority: 100,
      rules: [
        {
          tool: ToolType.SLACK,
          action: null,
          decision: ActionDecision.ALLOW,
          requiredRole: null,
          riskOverride: RiskLevel.LOW,
          conditionsJson: {
            externalCommunication: false,
          },
        },
      ],
    },
  },
  {
    id: "production-database-writes-approval",
    category: "Database",
    summary: "Require security review for production database mutations.",
    policy: {
      name: "Production database writes require approval",
      description: "Production Postgres demo writes, updates, and inserts require security admin approval.",
      status: PolicyStatus.ACTIVE,
      priority: 15,
      rules: [
        {
          tool: ToolType.POSTGRES,
          action: null,
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.security_admin,
          riskOverride: RiskLevel.CRITICAL,
          conditionsJson: {
            environment: "production",
            actionContains: ["write", "update", "insert"],
          },
        },
      ],
    },
  },
  {
    id: "webhook-production-triggers-approval",
    category: "Integrations",
    summary: "Require review before production webhook demo actions simulate delivery.",
    policy: {
      name: "Webhook production triggers require approval",
      description: "Production webhook.trigger, webhook.notify, and webhook.enqueue actions require reviewer approval.",
      status: PolicyStatus.ACTIVE,
      priority: 35,
      rules: [
        {
          tool: ToolType.WEBHOOK,
          action: null,
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.reviewer,
          riskOverride: RiskLevel.HIGH,
          conditionsJson: {
            productionEnvironment: true,
            actionContains: ["webhook.trigger", "webhook.notify", "webhook.enqueue"],
          },
        },
      ],
    },
  },
  {
    id: "high-risk-agents-production-approval",
    category: "Agent governance",
    summary: "Require approval when high-risk agents act in production.",
    policy: {
      name: "High-risk agents require approval for production actions",
      description: "Agents marked HIGH must get reviewer approval before production actions proceed.",
      status: PolicyStatus.ACTIVE,
      priority: 25,
      rules: [
        {
          tool: null,
          action: null,
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.reviewer,
          riskOverride: RiskLevel.HIGH,
          conditionsJson: {
            agentRiskTier: "HIGH",
            productionEnvironment: true,
          },
        },
      ],
    },
  },
  {
    id: "critical-agents-destructive-blocked",
    category: "Agent governance",
    summary: "Block destructive actions from critical-risk agents.",
    policy: {
      name: "Critical agents are blocked from destructive actions",
      description: "Agents marked CRITICAL cannot perform destructive delete, remove, or destroy actions in V1.",
      status: PolicyStatus.ACTIVE,
      priority: 4,
      rules: [
        {
          tool: null,
          action: null,
          decision: ActionDecision.BLOCK,
          requiredRole: null,
          riskOverride: RiskLevel.CRITICAL,
          conditionsJson: {
            agentRiskTier: "CRITICAL",
            actionContains: ["delete", "remove", "destroy"],
          },
        },
      ],
    },
  },
  {
    id: "sensitive-data-security-admin-approval",
    category: "Data safety",
    summary: "Escalate sensitive-data actions to security administrators.",
    policy: {
      name: "Sensitive data actions require security admin approval",
      description: "Private, sensitive, or regulated data actions require security admin approval.",
      status: PolicyStatus.ACTIVE,
      priority: 12,
      rules: [
        {
          tool: null,
          action: null,
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.security_admin,
          riskOverride: RiskLevel.HIGH,
          conditionsJson: {
            dataSensitivity: "sensitive",
          },
        },
      ],
    },
  },
] satisfies PolicyTemplate[];

export function getPolicyTemplate(templateId: string) {
  return policyTemplates.find((template) => template.id === templateId) ?? null;
}

export function getPolicyTemplateIds() {
  return [...policyTemplateIdValues];
}

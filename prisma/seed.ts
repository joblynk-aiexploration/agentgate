import { createHmac } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import "dotenv/config";
import {
  ActionDecision,
  ActionStatus,
  AgentRiskTier,
  AgentStatus,
  ApiKeyStatus,
  ApprovalStatus,
  BillingPlan,
  BillingStatus,
  IncidentSeverity,
  IncidentStatus,
  MembershipRole,
  OrganizationStatus,
  PolicyStatus,
  PrismaClient,
  RiskLevel,
  ToolConnectionStatus,
  ToolType,
  UserStatus,
} from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run the Prisma seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const DEMO_API_KEY = "ag_test_seed_support_refund_demo_key";
const DEVELOPMENT_API_KEY_PEPPER = "agentgate-development-seed-pepper";

function hashApiKey(key: string, pepper: string) {
  return createHmac("sha256", pepper).update(key).digest("hex");
}

async function main() {
  const apiKeyPepper = process.env.API_KEY_PEPPER ?? DEVELOPMENT_API_KEY_PEPPER;

  if (!process.env.API_KEY_PEPPER) {
    console.warn(
      "WARNING: API_KEY_PEPPER is not set. Using development-only seed pepper for the demo API key.",
    );
  }

  await prisma.organization.deleteMany({
    where: {
      slug: "acme",
    },
  });

  const passwordHash = await hash("Password123!", 12);

  const users = await Promise.all(
    [
      {
        email: "owner@agentgate.dev",
        name: "Acme Owner",
        role: MembershipRole.org_owner,
      },
      {
        email: "security@agentgate.dev",
        name: "Security Admin",
        role: MembershipRole.security_admin,
      },
      {
        email: "developer@agentgate.dev",
        name: "Developer",
        role: MembershipRole.developer,
      },
      {
        email: "reviewer@agentgate.dev",
        name: "Reviewer",
        role: MembershipRole.reviewer,
      },
      {
        email: "auditor@agentgate.dev",
        name: "Auditor",
        role: MembershipRole.auditor,
      },
    ].map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
        create: {
          email: user.email,
          name: user.name,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      }),
    ),
  );

  const [owner, securityAdmin, developer, reviewer] = users;

  const organization = await prisma.organization.create({
    data: {
      name: "Acme AI Operations",
      slug: "acme",
      plan: BillingPlan.BUSINESS,
      status: OrganizationStatus.ACTIVE,
      memberships: {
        create: users.map((user, index) => ({
          userId: user.id,
          role: [
            MembershipRole.org_owner,
            MembershipRole.security_admin,
            MembershipRole.developer,
            MembershipRole.reviewer,
            MembershipRole.auditor,
          ][index],
        })),
      },
      billingSubscription: {
        create: {
          plan: BillingPlan.BUSINESS,
          status: BillingStatus.ACTIVE,
        },
      },
    },
  });

  const supportRefundAgent = await prisma.agent.create({
    data: {
      organizationId: organization.id,
      ownerUserId: owner.id,
      name: "Support Refund Agent",
      slug: "support-refund-agent",
      department: "Support",
      status: AgentStatus.ACTIVE,
      riskTier: AgentRiskTier.HIGH,
      allowedToolsJson: [
        ToolType.STRIPE,
        ToolType.EMAIL_PREVIEW,
        ToolType.SLACK,
      ],
    },
  });

  const salesEmailAgent = await prisma.agent.create({
    data: {
      organizationId: organization.id,
      ownerUserId: developer.id,
      name: "Sales Email Agent",
      slug: "sales-email-agent",
      department: "Sales",
      status: AgentStatus.ACTIVE,
      riskTier: AgentRiskTier.STANDARD,
      allowedToolsJson: [ToolType.EMAIL_PREVIEW, ToolType.HUBSPOT],
    },
  });

  const databaseMaintenanceAgent = await prisma.agent.create({
    data: {
      organizationId: organization.id,
      ownerUserId: securityAdmin.id,
      name: "Database Maintenance Agent",
      slug: "database-maintenance-agent",
      department: "Engineering",
      status: AgentStatus.PAUSED,
      riskTier: AgentRiskTier.CRITICAL,
      allowedToolsJson: [ToolType.POSTGRES],
    },
  });

  await prisma.toolConnection.createMany({
    data: [
      {
        organizationId: organization.id,
        toolType: ToolType.SLACK,
        name: "Slack Demo",
        status: ToolConnectionStatus.DEMO,
        configJson: { channel: "#agentgate-demo" },
      },
      {
        organizationId: organization.id,
        toolType: ToolType.STRIPE,
        name: "Stripe Test Mode",
        status: ToolConnectionStatus.DEMO,
        configJson: { mode: "test" },
      },
      {
        organizationId: organization.id,
        toolType: ToolType.EMAIL_PREVIEW,
        name: "Email Preview",
        status: ToolConnectionStatus.DEMO,
        configJson: { delivery: "preview_only" },
      },
      {
        organizationId: organization.id,
        toolType: ToolType.HUBSPOT,
        name: "HubSpot Coming Soon",
        status: ToolConnectionStatus.DISABLED,
      },
      {
        organizationId: organization.id,
        toolType: ToolType.SALESFORCE,
        name: "Salesforce Coming Soon",
        status: ToolConnectionStatus.DISABLED,
      },
      {
        organizationId: organization.id,
        toolType: ToolType.GITHUB,
        name: "GitHub Coming Soon",
        status: ToolConnectionStatus.DISABLED,
      },
      {
        organizationId: organization.id,
        toolType: ToolType.POSTGRES,
        name: "Postgres Demo",
        status: ToolConnectionStatus.DEMO,
        configJson: { execution: "simulated" },
      },
    ],
  });

  const refundPolicy = await prisma.policy.create({
    data: {
      organizationId: organization.id,
      createdById: securityAdmin.id,
      name: "Refunds above $500 require approval.",
      description: "High-value refunds must be reviewed before simulated execution.",
      status: PolicyStatus.ACTIVE,
      priority: 10,
      rules: {
        create: {
          organizationId: organization.id,
          tool: ToolType.STRIPE,
          action: "refund.create",
          conditionsJson: {
            all: [
              { field: "payload.amountCents", operator: "gt", value: 50000 },
              { field: "environment", operator: "equals", value: "production" },
            ],
          },
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.reviewer,
          riskOverride: RiskLevel.HIGH,
        },
      },
    },
  });

  const deletePolicy = await prisma.policy.create({
    data: {
      organizationId: organization.id,
      createdById: securityAdmin.id,
      name: "Delete actions are always blocked.",
      description: "Destructive delete operations are blocked in V1.",
      status: PolicyStatus.ACTIVE,
      priority: 20,
      rules: {
        create: {
          organizationId: organization.id,
          action: "*.delete",
          conditionsJson: {
            any: [
              { field: "action", operator: "endsWith", value: ".delete" },
              { field: "action", operator: "contains", value: "delete" },
            ],
          },
          decision: ActionDecision.BLOCK,
          riskOverride: RiskLevel.CRITICAL,
        },
      },
    },
  });

  const emailPolicy = await prisma.policy.create({
    data: {
      organizationId: organization.id,
      createdById: securityAdmin.id,
      name: "External customer emails require approval.",
      description: "Customer-facing emails go to the approval inbox first.",
      status: PolicyStatus.ACTIVE,
      priority: 30,
      rules: {
        create: {
          organizationId: organization.id,
          tool: ToolType.EMAIL_PREVIEW,
          action: "email.send",
          conditionsJson: {
            all: [
              { field: "payload.recipientType", operator: "equals", value: "customer" },
              { field: "payload.destination", operator: "notEndsWith", value: "@acme.test" },
            ],
          },
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.reviewer,
          riskOverride: RiskLevel.MEDIUM,
        },
      },
    },
  });

  const slackPolicy = await prisma.policy.create({
    data: {
      organizationId: organization.id,
      createdById: securityAdmin.id,
      name: "Internal Slack messages are allowed.",
      description: "Internal Slack notifications can execute without approval.",
      status: PolicyStatus.ACTIVE,
      priority: 40,
      rules: {
        create: {
          organizationId: organization.id,
          tool: ToolType.SLACK,
          action: "message.send",
          conditionsJson: {
            all: [
              { field: "payload.channelType", operator: "equals", value: "internal" },
              { field: "environment", operator: "equals", value: "production" },
            ],
          },
          decision: ActionDecision.ALLOW,
          riskOverride: RiskLevel.LOW,
        },
      },
    },
  });

  const databasePolicy = await prisma.policy.create({
    data: {
      organizationId: organization.id,
      createdById: securityAdmin.id,
      name: "Production database writes require approval.",
      description: "Production database writes require review unless an agent is paused, which blocks the request.",
      status: PolicyStatus.ACTIVE,
      priority: 50,
      rules: {
        create: {
          organizationId: organization.id,
          tool: ToolType.POSTGRES,
          action: "query.write",
          conditionsJson: {
            all: [
              { field: "environment", operator: "equals", value: "production" },
              { field: "payload.statementType", operator: "in", value: ["INSERT", "UPDATE", "DELETE"] },
            ],
          },
          decision: ActionDecision.REQUIRE_APPROVAL,
          requiredRole: MembershipRole.security_admin,
          riskOverride: RiskLevel.CRITICAL,
        },
      },
    },
  });

  const supportApiKey = await prisma.apiKey.create({
    data: {
      organizationId: organization.id,
      createdById: developer.id,
      name: "Gateway Demo Org Key",
      keyPrefix: "ag_test_seed",
      keyHash: hashApiKey(DEMO_API_KEY, apiKeyPepper),
      status: ApiKeyStatus.ACTIVE,
    },
  });

  const refundAction = await prisma.actionRequest.create({
    data: {
      organizationId: organization.id,
      agentId: supportRefundAgent.id,
      apiKeyId: supportApiKey.id,
      tool: ToolType.STRIPE,
      action: "refund.create",
      environment: "production",
      payloadJson: {
        refundAmountCents: 120000,
        currency: "USD",
        customerId: "cus_demo_1200",
        reason: "VIP support escalation",
      },
      metadataJson: { source: "seed", scenario: "refund_requires_approval" },
      riskScore: 86,
      riskLevel: RiskLevel.HIGH,
      decision: ActionDecision.REQUIRE_APPROVAL,
      status: ActionStatus.PENDING_APPROVAL,
      requiresApproval: true,
      policyMatchedId: refundPolicy.id,
      reason: "Refund amount exceeds $500 production approval threshold.",
      idempotencyKey: "seed-refund-1200",
    },
  });

  const slackAction = await prisma.actionRequest.create({
    data: {
      organizationId: organization.id,
      agentId: supportRefundAgent.id,
      apiKeyId: supportApiKey.id,
      tool: ToolType.SLACK,
      action: "message.send",
      environment: "production",
      payloadJson: {
        channel: "#support-ops",
        channelType: "internal",
        text: "Refund request entered AgentGate approval review.",
      },
      riskScore: 18,
      riskLevel: RiskLevel.LOW,
      decision: ActionDecision.ALLOW,
      status: ActionStatus.ALLOWED,
      requiresApproval: false,
      policyMatchedId: slackPolicy.id,
      reason: "Internal Slack notification matches allow policy.",
      idempotencyKey: "seed-slack-allowed",
    },
  });

  const deleteAction = await prisma.actionRequest.create({
    data: {
      organizationId: organization.id,
      agentId: supportRefundAgent.id,
      apiKeyId: supportApiKey.id,
      tool: ToolType.CUSTOM,
      action: "customer.delete",
      environment: "production",
      payloadJson: {
        customerId: "cus_delete_demo",
        requestedBy: "support-refund-agent",
      },
      riskScore: 98,
      riskLevel: RiskLevel.CRITICAL,
      decision: ActionDecision.BLOCK,
      status: ActionStatus.BLOCKED,
      requiresApproval: false,
      policyMatchedId: deletePolicy.id,
      reason: "Delete actions are blocked by policy.",
      idempotencyKey: "seed-delete-blocked",
    },
  });

  const emailAction = await prisma.actionRequest.create({
    data: {
      organizationId: organization.id,
      agentId: salesEmailAgent.id,
      tool: ToolType.EMAIL_PREVIEW,
      action: "email.send",
      environment: "production",
      payloadJson: {
        to: "customer@example.com",
        recipientType: "customer",
        destination: "customer@example.com",
        subject: "Follow-up from Acme",
      },
      riskScore: 64,
      riskLevel: RiskLevel.MEDIUM,
      decision: ActionDecision.REQUIRE_APPROVAL,
      status: ActionStatus.PENDING_APPROVAL,
      requiresApproval: true,
      policyMatchedId: emailPolicy.id,
      reason: "External customer email requires approval.",
      idempotencyKey: "seed-email-approval",
    },
  });

  const databaseAction = await prisma.actionRequest.create({
    data: {
      organizationId: organization.id,
      agentId: databaseMaintenanceAgent.id,
      tool: ToolType.POSTGRES,
      action: "query.write",
      environment: "production",
      payloadJson: {
        statementType: "UPDATE",
        table: "customers",
        simulated: true,
      },
      metadataJson: { agentStatus: AgentStatus.PAUSED },
      riskScore: 100,
      riskLevel: RiskLevel.CRITICAL,
      decision: ActionDecision.BLOCK,
      status: ActionStatus.BLOCKED,
      requiresApproval: false,
      policyMatchedId: databasePolicy.id,
      reason: "Database Maintenance Agent is paused, so the request is blocked.",
      idempotencyKey: "seed-database-paused-blocked",
    },
  });

  await prisma.approvalRequest.createMany({
    data: [
      {
        organizationId: organization.id,
        actionRequestId: refundAction.id,
        status: ApprovalStatus.PENDING,
        requiredRole: MembershipRole.reviewer,
        assignedToId: reviewer.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
      {
        organizationId: organization.id,
        actionRequestId: emailAction.id,
        status: ApprovalStatus.PENDING,
        requiredRole: MembershipRole.reviewer,
        assignedToId: reviewer.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    ],
  });

  await prisma.riskAssessment.createMany({
    data: [
      {
        organizationId: organization.id,
        actionRequestId: refundAction.id,
        score: 86,
        level: RiskLevel.HIGH,
        signalsJson: {
          amount: "above_threshold",
          environment: "production",
          tool: ToolType.STRIPE,
        },
        explanation: "High-value production refund requires human approval.",
        modelVersion: "local-rules-v1",
      },
      {
        organizationId: organization.id,
        actionRequestId: slackAction.id,
        score: 18,
        level: RiskLevel.LOW,
        signalsJson: {
          channelType: "internal",
          tool: ToolType.SLACK,
        },
        explanation: "Internal Slack notification is low risk.",
        modelVersion: "local-rules-v1",
      },
      {
        organizationId: organization.id,
        actionRequestId: deleteAction.id,
        score: 98,
        level: RiskLevel.CRITICAL,
        signalsJson: {
          action: "delete",
          destructive: true,
        },
        explanation: "Delete actions are blocked by policy.",
        modelVersion: "local-rules-v1",
      },
      {
        organizationId: organization.id,
        actionRequestId: emailAction.id,
        score: 64,
        level: RiskLevel.MEDIUM,
        signalsJson: {
          recipientType: "customer",
          externalDestination: true,
        },
        explanation: "External customer email requires approval.",
        modelVersion: "local-rules-v1",
      },
      {
        organizationId: organization.id,
        actionRequestId: databaseAction.id,
        score: 100,
        level: RiskLevel.CRITICAL,
        signalsJson: {
          agentStatus: AgentStatus.PAUSED,
          productionWrite: true,
        },
        explanation: "Paused agents are blocked before policy approval.",
        modelVersion: "local-rules-v1",
      },
    ],
  });

  await prisma.incident.create({
    data: {
      organizationId: organization.id,
      createdById: securityAdmin.id,
      title: "Demo blocked destructive action",
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.INVESTIGATING,
      description: "Seed incident linked to a blocked customer.delete request in the demo tenant.",
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        actorType: "user",
        actorId: owner.id,
        eventType: "agent.created",
        targetType: "Agent",
        targetId: supportRefundAgent.id,
        metadataJson: { name: supportRefundAgent.name },
      },
      {
        organizationId: organization.id,
        actorType: "user",
        actorId: securityAdmin.id,
        eventType: "policy.created",
        targetType: "Policy",
        targetId: refundPolicy.id,
        metadataJson: { name: refundPolicy.name },
      },
      {
        organizationId: organization.id,
        actorType: "agent",
        actorId: supportRefundAgent.id,
        eventType: "approval.requested",
        targetType: "ActionRequest",
        targetId: refundAction.id,
        metadataJson: { requiredRole: MembershipRole.reviewer },
      },
      {
        organizationId: organization.id,
        actorType: "agent",
        actorId: supportRefundAgent.id,
        eventType: "action.blocked",
        targetType: "ActionRequest",
        targetId: deleteAction.id,
        metadataJson: { reason: deleteAction.reason },
      },
      {
        organizationId: organization.id,
        actorType: "user",
        actorId: developer.id,
        eventType: "api_key.created",
        targetType: "ApiKey",
        targetId: supportApiKey.id,
        metadataJson: { keyPrefix: supportApiKey.keyPrefix },
      },
      {
        organizationId: organization.id,
        actorType: "agent",
        actorId: supportRefundAgent.id,
        eventType: "gateway.action_checked",
        targetType: "ActionRequest",
        targetId: refundAction.id,
        metadataJson: {
          decision: ActionDecision.REQUIRE_APPROVAL,
          riskLevel: RiskLevel.HIGH,
        },
      },
      {
        organizationId: organization.id,
        actorType: "agent",
        actorId: databaseMaintenanceAgent.id,
        eventType: "action.blocked",
        targetType: "ActionRequest",
        targetId: databaseAction.id,
        metadataJson: { reason: databaseAction.reason },
      },
    ],
  });

  console.log("Seeded AgentGate demo tenant: Acme AI Operations (slug: acme)");
  console.log(`Local demo API key: ${DEMO_API_KEY}`);
  console.log("The demo API key is printed for local development only and only its hash is stored.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

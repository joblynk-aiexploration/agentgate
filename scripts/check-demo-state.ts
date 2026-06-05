import { createHmac } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  AgentStatus,
  ApiKeyStatus,
  ApprovalStatus,
  PrismaClient,
} from "../src/generated/prisma/client";

const DEMO_API_KEY = "ag_test_seed_support_refund_demo_key";
const DEMO_ORGANIZATION_SLUG = "acme";
const DEMO_USER_EMAILS = [
  "owner@agentgate.dev",
  "security@agentgate.dev",
  "developer@agentgate.dev",
  "reviewer@agentgate.dev",
  "auditor@agentgate.dev",
  "platform@agentgate.dev",
];

type Check = {
  label: string;
  passed: boolean;
  detail?: string;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to check demo state.");
}

if (!process.env.API_KEY_PEPPER) {
  throw new Error("API_KEY_PEPPER is required to check the demo API key hash.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

function hashApiKey(apiKey: string) {
  return createHmac("sha256", process.env.API_KEY_PEPPER!)
    .update(apiKey)
    .digest("hex");
}

function printCheck(check: Check) {
  const marker = check.passed ? "PASS" : "FAIL";
  const detail = check.detail ? ` - ${check.detail}` : "";

  console.log(`[${marker}] ${check.label}${detail}`);
}

async function main() {
  const organization = await prisma.organization.findUnique({
    where: {
      slug: DEMO_ORGANIZATION_SLUG,
    },
    select: {
      id: true,
      name: true,
      status: true,
      killSwitchEnabled: true,
    },
  });

  const organizationId = organization?.id;
  const demoKeyHash = hashApiKey(DEMO_API_KEY);

  const [
    userCount,
    agentCount,
    pausedAgent,
    policyCount,
    apiKey,
    actionRequestCount,
    riskAssessmentCount,
    pendingApprovalCount,
    auditLogCount,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        email: {
          in: DEMO_USER_EMAILS,
        },
      },
    }),
    organizationId
      ? prisma.agent.count({
          where: {
            organizationId,
          },
        })
      : 0,
    organizationId
      ? prisma.agent.findFirst({
          where: {
            organizationId,
            status: AgentStatus.PAUSED,
          },
          select: {
            name: true,
            slug: true,
          },
        })
      : null,
    organizationId
      ? prisma.policy.count({
          where: {
            organizationId,
          },
        })
      : 0,
    organizationId
      ? prisma.apiKey.findFirst({
          where: {
            organizationId,
            keyHash: demoKeyHash,
            status: ApiKeyStatus.ACTIVE,
          },
          select: {
            keyPrefix: true,
            status: true,
          },
        })
      : null,
    organizationId
      ? prisma.actionRequest.count({
          where: {
            organizationId,
          },
        })
      : 0,
    organizationId
      ? prisma.riskAssessment.count({
          where: {
            organizationId,
          },
        })
      : 0,
    organizationId
      ? prisma.approvalRequest.count({
          where: {
            organizationId,
            status: ApprovalStatus.PENDING,
          },
        })
      : 0,
    organizationId
      ? prisma.auditLog.count({
          where: {
            organizationId,
          },
        })
      : 0,
  ]);

  const checks: Check[] = [
    {
      label: "organization exists",
      passed: organization?.name === "Acme AI Operations",
      detail: organization
        ? `status=${organization.status}, killSwitch=${organization.killSwitchEnabled}`
        : undefined,
    },
    {
      label: "users exist",
      passed: userCount === DEMO_USER_EMAILS.length,
      detail: `count=${userCount}/${DEMO_USER_EMAILS.length}`,
    },
    {
      label: "agents exist",
      passed: agentCount >= 3,
      detail: `count=${agentCount}`,
    },
    {
      label: "policies exist",
      passed: policyCount >= 5,
      detail: `count=${policyCount}`,
    },
    {
      label: "API key exists",
      passed: Boolean(apiKey),
      detail: apiKey ? `status=${apiKey.status}, prefix=${apiKey.keyPrefix}` : undefined,
    },
    {
      label: "sample action requests exist",
      passed: actionRequestCount >= 5,
      detail: `count=${actionRequestCount}`,
    },
    {
      label: "sample risk assessments exist",
      passed: riskAssessmentCount >= 5,
      detail: `count=${riskAssessmentCount}`,
    },
    {
      label: "pending approvals exist",
      passed: pendingApprovalCount >= 2,
      detail: `count=${pendingApprovalCount}`,
    },
    {
      label: "audit logs exist",
      passed: auditLogCount >= 7,
      detail: `count=${auditLogCount}`,
    },
    {
      label: "paused agent exists",
      passed: Boolean(pausedAgent),
      detail: pausedAgent ? `${pausedAgent.name} (${pausedAgent.slug})` : undefined,
    },
  ];

  console.log("AgentGate clean demo state checklist\n");
  checks.forEach(printCheck);

  const failed = checks.filter((check) => !check.passed);

  if (failed.length > 0) {
    console.error(`\nDemo state check failed: ${failed.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("\nDemo state check passed.");
}

main()
  .catch((error) => {
    console.error("Demo state check failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

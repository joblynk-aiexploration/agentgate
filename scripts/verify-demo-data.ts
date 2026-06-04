import { createHmac } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  ApiKeyStatus,
  ApprovalStatus,
  PrismaClient,
} from "../src/generated/prisma/client";

const DEMO_API_KEY =
  process.env.AGENTGATE_DEMO_API_KEY ?? "ag_test_seed_support_refund_demo_key";

type Check = {
  label: string;
  passed: boolean;
  detail?: string;
};

function hashApiKey(apiKey: string) {
  const pepper = process.env.API_KEY_PEPPER;

  if (!pepper) {
    throw new Error("API_KEY_PEPPER is required to verify demo seed data.");
  }

  return createHmac("sha256", pepper).update(apiKey).digest("hex");
}

function printCheck(check: Check) {
  const marker = check.passed ? "PASS" : "FAIL";
  const detail = check.detail ? ` - ${check.detail}` : "";

  console.log(`[${marker}] ${check.label}${detail}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to verify demo seed data.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  try {
    const organization = await prisma.organization.findUnique({
      where: { slug: "acme" },
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
      ownerUser,
      reviewerUser,
      supportRefundAgent,
      refundPolicy,
      demoApiKey,
      pendingApprovalCount,
      auditLogCount,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { email: "owner@agentgate.dev" },
        select: { id: true, status: true },
      }),
      prisma.user.findUnique({
        where: { email: "reviewer@agentgate.dev" },
        select: { id: true, status: true },
      }),
      organizationId
        ? prisma.agent.findFirst({
            where: {
              organizationId,
              slug: "support-refund-agent",
            },
            select: {
              id: true,
              status: true,
              riskTier: true,
            },
          })
        : null,
      organizationId
        ? prisma.policy.findFirst({
            where: {
              organizationId,
              name: {
                contains: "Refunds above $500",
                mode: "insensitive",
              },
            },
            select: {
              id: true,
              status: true,
              rules: {
                select: { id: true },
              },
            },
          })
        : null,
      organizationId
        ? prisma.apiKey.findFirst({
            where: {
              organizationId,
              keyHash: demoKeyHash,
              status: ApiKeyStatus.ACTIVE,
            },
            select: {
              id: true,
              keyPrefix: true,
              agentId: true,
              status: true,
            },
          })
        : null,
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
        label: "Acme AI Operations organization",
        passed: organization?.name === "Acme AI Operations",
        detail: organization
          ? `status=${organization.status}, killSwitch=${organization.killSwitchEnabled}`
          : undefined,
      },
      {
        label: "owner@agentgate.dev user",
        passed: Boolean(ownerUser),
        detail: ownerUser ? `status=${ownerUser.status}` : undefined,
      },
      {
        label: "reviewer@agentgate.dev user",
        passed: Boolean(reviewerUser),
        detail: reviewerUser ? `status=${reviewerUser.status}` : undefined,
      },
      {
        label: "Support Refund Agent",
        passed: Boolean(supportRefundAgent),
        detail: supportRefundAgent
          ? `status=${supportRefundAgent.status}, riskTier=${supportRefundAgent.riskTier}`
          : undefined,
      },
      {
        label: "Refunds above $500 policy",
        passed: Boolean(refundPolicy && refundPolicy.rules.length > 0),
        detail: refundPolicy
          ? `status=${refundPolicy.status}, rules=${refundPolicy.rules.length}`
          : undefined,
      },
      {
        label: "Demo API key record",
        passed: Boolean(demoApiKey),
        detail: demoApiKey
          ? `status=${demoApiKey.status}, prefix=${demoApiKey.keyPrefix}`
          : undefined,
      },
      {
        label: "At least one pending approval",
        passed: pendingApprovalCount > 0,
        detail: `count=${pendingApprovalCount}`,
      },
      {
        label: "At least one audit log",
        passed: auditLogCount > 0,
        detail: `count=${auditLogCount}`,
      },
    ];

    console.log("AgentGate demo seed data checklist\n");
    checks.forEach(printCheck);

    const failed = checks.filter((check) => !check.passed);

    if (failed.length > 0) {
      console.error(`\nDemo seed data verification failed: ${failed.length} check(s) failed.`);
      process.exitCode = 1;
      return;
    }

    console.log("\nDemo seed data verification passed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Demo seed data verification failed.");
  console.error(error);
  process.exit(1);
});

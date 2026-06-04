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

const gatewayPayload = {
  agentId: "support-refund-agent",
  tool: "stripe",
  action: "refund.create",
  environment: "production",
  amount: 1200,
  currency: "USD",
  reason: "Customer was double charged",
};

type Check = {
  label: string;
  passed: boolean;
  detail?: string;
};

function hashApiKey(apiKey: string) {
  const pepper = process.env.API_KEY_PEPPER;

  if (!pepper) {
    throw new Error("API_KEY_PEPPER is required to verify the demo API key hash.");
  }

  return createHmac("sha256", pepper).update(apiKey).digest("hex");
}

function printCheck(check: Check) {
  const marker = check.passed ? "PASS" : "FAIL";
  const detail = check.detail ? ` - ${check.detail}` : "";

  console.log(`[${marker}] ${check.label}${detail}`);
}

function printCurlExample(appUrl = "http://localhost:3000") {
  console.log("\nLocal demo gateway curl:");
  console.log(`curl -X POST ${appUrl.replace(/\/$/, "")}/api/gateway/check \\`);
  console.log(`  -H "Authorization: Bearer ${DEMO_API_KEY}" \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log("  -d '{");
  console.log('    "agentId": "support-refund-agent",');
  console.log('    "tool": "stripe",');
  console.log('    "action": "refund.create",');
  console.log('    "environment": "production",');
  console.log('    "amount": 1200,');
  console.log('    "currency": "USD",');
  console.log('    "reason": "Customer was double charged"');
  console.log("  }'");
}

async function verifyLiveGateway(appUrl: string) {
  const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/gateway/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEMO_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `verify-demo-${Date.now()}`,
    },
    body: JSON.stringify(gatewayPayload),
  });

  const body = await response.json().catch(() => null);
  const passed =
    response.ok &&
    body?.decision === "REQUIRE_APPROVAL" &&
    body?.requiresApproval === true &&
    body?.status === "PENDING_APPROVAL";

  return {
    passed,
    detail: response.ok
      ? `decision=${body?.decision ?? "unknown"}, status=${body?.status ?? "unknown"}`
      : `HTTP ${response.status}`,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to verify the V1 demo.");
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
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { email: "owner@agentgate.dev" },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { email: "reviewer@agentgate.dev" },
        select: { id: true },
      }),
      organizationId
        ? prisma.agent.findFirst({
            where: {
              organizationId,
              slug: "support-refund-agent",
            },
            select: { id: true, status: true },
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
            select: { id: true, status: true },
          })
        : null,
      organizationId
        ? prisma.apiKey.findFirst({
            where: {
              organizationId,
              keyHash: demoKeyHash,
              status: ApiKeyStatus.ACTIVE,
            },
            select: { id: true, keyPrefix: true, agentId: true },
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
    ]);

    const checks: Check[] = [
      {
        label: "Acme AI Operations organization exists",
        passed: organization?.name === "Acme AI Operations",
      },
      {
        label: "owner@agentgate.dev user exists",
        passed: Boolean(ownerUser),
      },
      {
        label: "reviewer@agentgate.dev user exists",
        passed: Boolean(reviewerUser),
      },
      {
        label: "Support Refund Agent exists",
        passed: Boolean(supportRefundAgent),
        detail: supportRefundAgent ? `status=${supportRefundAgent.status}` : undefined,
      },
      {
        label: "Refunds above $500 policy exists",
        passed: Boolean(refundPolicy),
        detail: refundPolicy ? `status=${refundPolicy.status}` : undefined,
      },
      {
        label: "Demo API key hash exists",
        passed: Boolean(demoApiKey),
        detail: demoApiKey ? `prefix=${demoApiKey.keyPrefix}` : undefined,
      },
      {
        label: "Sample pending approvals exist",
        passed: pendingApprovalCount > 0,
        detail: `count=${pendingApprovalCount}`,
      },
    ];

    console.log("AgentGate V1 demo verification\n");
    checks.forEach(printCheck);
    printCurlExample(process.env.APP_URL);

    if (process.env.APP_URL && process.env.AGENTGATE_DEMO_API_KEY) {
      console.log("\nLive gateway check:");
      const liveCheck = await verifyLiveGateway(process.env.APP_URL);
      printCheck({
        label: "POST /api/gateway/check returns REQUIRE_APPROVAL",
        ...liveCheck,
      });
      checks.push({
        label: "Live gateway check",
        ...liveCheck,
      });
    } else {
      console.log(
        "\nLive gateway check skipped. Set APP_URL and AGENTGATE_DEMO_API_KEY to test the running app.",
      );
    }

    const failed = checks.filter((check) => !check.passed);

    if (failed.length > 0) {
      console.error(`\nV1 demo verification failed: ${failed.length} check(s) failed.`);
      process.exitCode = 1;
      return;
    }

    console.log("\nV1 demo verification passed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("V1 demo verification failed.");
  console.error(error);
  process.exit(1);
});

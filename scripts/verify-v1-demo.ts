import "dotenv/config";
import {
  ActionStatus,
  AgentStatus,
  ApprovalStatus,
  MembershipRole,
  ToolType,
} from "../src/generated/prisma/client";
import { canActOnApproval } from "../src/lib/approvals";
import { prisma } from "../src/lib/prisma";
import { createAuditLog } from "../src/server/audit/audit-service";
import { gatewayService } from "../src/server/gateway/gateway-service";

const DEMO_API_KEY = "ag_test_seed_support_refund_demo_key";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function gatewayHeaders() {
  return new Headers({
    Authorization: `Bearer ${DEMO_API_KEY}`,
    "Content-Type": "application/json",
    "x-real-ip": "127.0.0.1",
    "user-agent": "agentgate-v1-demo-verifier",
  });
}

async function main() {
  const organization = await prisma.organization.findUnique({
    where: { slug: "acme" },
    select: {
      id: true,
      killSwitchEnabled: true,
    },
  });

  assert(organization != null, "Expected seeded acme organization.");

  const [supportAgent, reviewerMembership] = await Promise.all([
    prisma.agent.findFirst({
      where: {
        organizationId: organization.id,
        slug: "support-refund-agent",
      },
      select: {
        id: true,
        slug: true,
      },
    }),
    prisma.membership.findFirst({
      where: {
        organizationId: organization.id,
        role: MembershipRole.reviewer,
      },
      select: {
        organizationId: true,
        role: true,
        userId: true,
      },
    }),
  ]);

  assert(supportAgent != null, "Expected seeded Support Refund Agent.");
  assert(reviewerMembership != null, "Expected seeded reviewer membership.");

  await prisma.organization.update({
    where: { id: organization.id },
    data: { killSwitchEnabled: false },
  });
  await prisma.agent.update({
    where: {
      id: supportAgent.id,
      organizationId: organization.id,
    },
    data: { status: AgentStatus.ACTIVE },
  });

  const runId = `verify-v1-${Date.now()}`;
  const refundPayload = {
    agentId: supportAgent.slug,
    tool: ToolType.STRIPE,
    action: "refund.create",
    environment: "production",
    amount: 1200,
    currency: "USD",
    reason: "Customer was double charged",
    payload: { customerId: "cus_verify" },
    metadata: { customerTier: "standard" },
  };

  const refund = await gatewayService.check(
    refundPayload,
    gatewayHeaders(),
    `${runId}-refund`,
  );

  assert(
    refund.decision === "REQUIRE_APPROVAL",
    `Expected refund decision REQUIRE_APPROVAL, got ${refund.decision}`,
  );
  assert(refund.allowed === false, "Refund requiring approval must not be allowed yet.");
  assert(refund.requiresApproval, "Refund should require approval.");
  assert(Boolean(refund.approvalRequestId), "Refund should create approval request.");

  const replay = await gatewayService.check(
    refundPayload,
    gatewayHeaders(),
    `${runId}-refund`,
  );
  assert(
    replay.actionRequestId === refund.actionRequestId,
    "Gateway idempotency should replay the original action request for the same API key.",
  );

  const approval = await prisma.approvalRequest.findFirst({
    where: {
      id: refund.approvalRequestId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      actionRequestId: true,
      assignedToId: true,
      requiredRole: true,
      status: true,
    },
  });

  assert(approval != null, "Expected approval request for refund.");
  assert(
    canActOnApproval(reviewerMembership, approval),
    "Reviewer membership should be eligible for seeded approval.",
  );

  await prisma.$transaction(async (tx) => {
    await tx.approvalRequest.update({
      where: {
        id: approval.id,
        organizationId: organization.id,
      },
      data: {
        status: ApprovalStatus.APPROVED,
        reviewedById: reviewerMembership.userId,
        reviewComment: "Verified by V1 QA script.",
      },
    });
    await tx.actionRequest.update({
      where: {
        id: approval.actionRequestId,
        organizationId: organization.id,
      },
      data: {
        status: ActionStatus.APPROVED,
      },
    });
  });

  await createAuditLog({
    organizationId: organization.id,
    actorType: "user",
    actorId: reviewerMembership.userId,
    eventType: "approval.approved",
    targetType: "ActionRequest",
    targetId: approval.actionRequestId,
    metadata: {
      source: "verify-v1-demo",
      approvalRequestId: approval.id,
    },
  });

  await prisma.agent.update({
    where: {
      id: supportAgent.id,
      organizationId: organization.id,
    },
    data: { status: AgentStatus.PAUSED },
  });

  const paused = await gatewayService.check(
    refundPayload,
    gatewayHeaders(),
    `${runId}-paused`,
  );

  assert(paused.decision === "BLOCK", `Expected paused agent BLOCK, got ${paused.decision}`);
  assert(
    paused.reason === "Agent is paused by admin kill switch.",
    `Unexpected paused reason: ${paused.reason}`,
  );

  await prisma.agent.update({
    where: {
      id: supportAgent.id,
      organizationId: organization.id,
    },
    data: { status: AgentStatus.ACTIVE },
  });
  await prisma.organization.update({
    where: { id: organization.id },
    data: { killSwitchEnabled: true },
  });

  const killSwitch = await gatewayService.check(
    refundPayload,
    gatewayHeaders(),
    `${runId}-kill-switch`,
  );

  assert(
    killSwitch.decision === "BLOCK",
    `Expected organization kill switch BLOCK, got ${killSwitch.decision}`,
  );
  assert(
    killSwitch.reason === "Organization-level kill switch is active.",
    `Unexpected kill switch reason: ${killSwitch.reason}`,
  );

  await prisma.organization.update({
    where: { id: organization.id },
    data: { killSwitchEnabled: false },
  });
  await prisma.agent.update({
    where: {
      id: supportAgent.id,
      organizationId: organization.id,
    },
    data: { status: AgentStatus.ACTIVE },
  });

  const auditCounts = await prisma.auditLog.groupBy({
    by: ["eventType"],
    where: {
      organizationId: organization.id,
      targetId: {
        in: [refund.actionRequestId, paused.actionRequestId, killSwitch.actionRequestId],
      },
    },
    _count: {
      id: true,
    },
  });

  const eventTypes = new Set(auditCounts.map((item) => item.eventType));
  assert(eventTypes.has("gateway.action_checked"), "Expected gateway action audit logs.");
  assert(eventTypes.has("approval.requested"), "Expected approval requested audit log.");
  assert(eventTypes.has("action.blocked"), "Expected blocked action audit log.");

  console.log("V1 demo verification passed.");
  console.log({
    refund,
    replayActionRequestId: replay.actionRequestId,
    paused,
    killSwitch,
    auditCounts,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

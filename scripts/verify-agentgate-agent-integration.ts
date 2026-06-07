import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  ActionDecision,
  ActionStatus,
  ApprovalStatus,
  PrismaClient,
} from "../src/generated/prisma/client";

const DEMO_ORGANIZATION_SLUG = "acme";
const DEMO_AGENT_SLUG = "support-refund-agent";
const DEMO_API_KEY = "ag_test_seed_support_refund_demo_key";
const SCENARIOS = [
  "small-refund",
  "large-refund",
  "blocked-delete",
  "external-email",
  "database-write",
] as const;

type Check = {
  detail?: string;
  label: string;
  passed: boolean;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

function metadataScenario(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const scenario = (value as Record<string, unknown>).scenario;

  return typeof scenario === "string" ? scenario : null;
}

function hasAuditEvent(
  logs: { eventType: string; targetId: string | null }[],
  eventType: string,
  targetId?: string,
) {
  return logs.some(
    (log) =>
      log.eventType === eventType && (!targetId || log.targetId === targetId),
  );
}

function printCheck(check: Check) {
  const marker = check.passed ? "PASS" : "FAIL";
  const detail = check.detail ? ` - ${check.detail}` : "";

  console.log(`[${marker}] ${check.label}${detail}`);
}

async function readTranscriptFiles() {
  const logsDir = path.join(
    process.cwd(),
    "examples",
    "agents",
    "support-ops-agent",
    "run-logs",
  );
  const entries = await readdir(logsDir).catch(() => []);
  const jsonFiles = entries.filter((entry) => entry.endsWith(".json"));
  const contents = await Promise.all(
    jsonFiles.map(async (file) => ({
      file,
      content: await readFile(path.join(logsDir, file), "utf8"),
    })),
  );

  return contents;
}

async function main() {
  const organization = await prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
    select: { id: true, name: true },
  });

  if (!organization) {
    throw new Error("Acme AI Operations organization was not found.");
  }

  const agent = await prisma.agent.findFirst({
    where: {
      organizationId: organization.id,
      slug: DEMO_AGENT_SLUG,
    },
    select: { id: true, name: true },
  });

  if (!agent) {
    throw new Error("Support Refund Agent was not found.");
  }

  const actions = await prisma.actionRequest.findMany({
    where: {
      organizationId: organization.id,
      agentId: agent.id,
      metadataJson: {
        path: ["source"],
        equals: "support-ops-agent",
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      approvalRequest: true,
      riskAssessments: true,
    },
  });

  const latestByScenario = new Map<(typeof SCENARIOS)[number], (typeof actions)[number]>();

  for (const action of actions) {
    const scenario = metadataScenario(action.metadataJson);

    if (
      scenario &&
      SCENARIOS.includes(scenario as (typeof SCENARIOS)[number]) &&
      !latestByScenario.has(scenario as (typeof SCENARIOS)[number])
    ) {
      latestByScenario.set(scenario as (typeof SCENARIOS)[number], action);
    }
  }

  const actionIds = actions.map((action) => action.id);
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: organization.id,
      OR: actionIds.length > 0 ? actionIds.map((targetId) => ({ targetId })) : [],
    },
    select: {
      eventType: true,
      targetId: true,
    },
  });

  const transcripts = await readTranscriptFiles();
  const transcriptText = transcripts.map((file) => file.content).join("\n");
  const latestLargeRefund = latestByScenario.get("large-refund");
  const approvalLargeRefund = actions.find(
    (action) =>
      metadataScenario(action.metadataJson) === "large-refund" &&
      action.decision === ActionDecision.REQUIRE_APPROVAL &&
      action.approvalRequest,
  );
  const executedLargeRefund = actions.find(
    (action) =>
      metadataScenario(action.metadataJson) === "large-refund" &&
      action.status === ActionStatus.EXECUTED,
  );
  const pausedLargeRefundBlock = actions.find(
    (action) =>
      metadataScenario(action.metadataJson) === "large-refund" &&
      action.decision === ActionDecision.BLOCK &&
      action.reason.toLowerCase().includes("agent is paused"),
  );
  const latestBlockedDelete = latestByScenario.get("blocked-delete");
  const latestExternalEmail = latestByScenario.get("external-email");
  const killSwitchSmallRefundBlock = actions.find(
    (action) =>
      metadataScenario(action.metadataJson) === "small-refund" &&
      action.decision === ActionDecision.BLOCK &&
      action.reason.toLowerCase().includes("organization-level kill switch"),
  );

  const checks: Check[] = [
    {
      label: "recent ActionRequests exist for each scenario",
      passed: SCENARIOS.every((scenario) => latestByScenario.has(scenario)),
      detail: `found=${Array.from(latestByScenario.keys()).join(", ") || "none"}`,
    },
    {
      label: "large-refund action exists",
      passed: Boolean(latestLargeRefund),
      detail: latestLargeRefund?.id,
    },
    {
      label: "large-refund decision requires approval",
      passed: Boolean(approvalLargeRefund),
      detail: approvalLargeRefund?.id,
    },
    {
      label: "large-refund has ApprovalRequest",
      passed: Boolean(approvalLargeRefund?.approvalRequest),
      detail: approvalLargeRefund?.approvalRequest?.status,
    },
    {
      label: "blocked-delete decision is BLOCK",
      passed: latestBlockedDelete?.decision === ActionDecision.BLOCK,
      detail: latestBlockedDelete?.decision,
    },
    {
      label: "blocked-delete status is BLOCKED",
      passed: latestBlockedDelete?.status === ActionStatus.BLOCKED,
      detail: latestBlockedDelete?.status,
    },
    {
      label: "external-email has ApprovalRequest",
      passed: Boolean(latestExternalEmail?.approvalRequest),
      detail: latestExternalEmail?.approvalRequest?.status,
    },
    {
      label: "RiskAssessments exist",
      passed: actions.every((action) => action.riskAssessments.length > 0),
      detail: `checked=${actions.length}`,
    },
    {
      label: "AuditLogs include gateway action checked",
      passed: auditLogs.some((log) => log.eventType === "gateway.action_checked"),
    },
    {
      label: "AuditLogs include approval requested",
      passed: auditLogs.some((log) => log.eventType === "approval.requested"),
    },
    {
      label: "AuditLogs include blocked action",
      passed: auditLogs.some((log) => log.eventType === "action.blocked"),
    },
    {
      label: "latest large-refund approval requested audit exists",
      passed: approvalLargeRefund
        ? hasAuditEvent(auditLogs, "approval.requested", approvalLargeRefund.id)
        : false,
    },
    {
      label: "latest blocked-delete blocked audit exists",
      passed: latestBlockedDelete
        ? hasAuditEvent(auditLogs, "action.blocked", latestBlockedDelete.id)
        : false,
    },
    {
      label: "agent transcripts were written",
      passed: transcripts.length > 0,
      detail: `count=${transcripts.length}`,
    },
    {
      label: "transcripts do not contain full demo API key",
      passed: !transcriptText.includes(DEMO_API_KEY),
    },
    {
      label: "approval/resume produced executed large-refund action",
      passed: Boolean(executedLargeRefund),
      detail: executedLargeRefund?.id,
    },
    {
      label: "paused agent produced blocked large-refund action",
      passed: Boolean(pausedLargeRefundBlock),
      detail: pausedLargeRefundBlock?.id,
    },
    {
      label: "organization kill switch produced blocked small-refund action",
      passed: Boolean(killSwitchSmallRefundBlock),
      detail: killSwitchSmallRefundBlock?.id,
    },
  ];

  console.log("AgentGate Support Operations Agent integration verification\n");
  checks.forEach(printCheck);

  if (approvalLargeRefund) {
    console.log(`\nApproval large-refund actionRequestId=${approvalLargeRefund.id}`);
    console.log(
      `Approval large-refund approvalStatus=${approvalLargeRefund.approvalRequest?.status ?? "none"}`,
    );
  }

  const approvedOrExecuted = actions.filter(
    (action) =>
      action.status === ActionStatus.APPROVED ||
      action.status === ActionStatus.EXECUTED,
  );
  const approvalRequested = actions.filter(
    (action) => action.requiresApproval || action.approvalRequest,
  );
  const executedWithoutApproval = approvedOrExecuted.filter(
    (action) =>
      action.decision === ActionDecision.REQUIRE_APPROVAL &&
      action.approvalRequest?.status !== ApprovalStatus.APPROVED &&
      action.approvalRequest?.status !== ApprovalStatus.EDITED,
  );

  const safetyChecks: Check[] = [
    {
      label: "no approval-required action executed before approval",
      passed: executedWithoutApproval.length === 0,
      detail: `checked=${approvalRequested.length}`,
    },
    {
      label: "blocked actions were not executed",
      passed: actions
        .filter((action) => action.decision === ActionDecision.BLOCK)
        .every((action) => action.status === ActionStatus.BLOCKED),
    },
  ];

  safetyChecks.forEach(printCheck);

  const failed = [...checks, ...safetyChecks].filter((check) => !check.passed);

  if (failed.length > 0) {
    console.error(`\nAgent integration verification failed: ${failed.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log("\nAgent integration verification passed.");
}

main()
  .catch((error) => {
    console.error("Agent integration verification failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

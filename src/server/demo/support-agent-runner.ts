import { ActionDecision, type MembershipRole } from "@/generated/prisma/client";
import { hashApiKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";
import { gatewayService } from "@/server/gateway/gateway-service";
import type {
  GatewayActionRequest,
} from "@/server/gateway/types";
import { gatewayCheckRequestSchema } from "@/server/gateway/types";
import {
  listSupportAgentScenarioMetadata,
  runSupportAgentScenario,
  type SupportAgentClient,
  isSupportAgentScenarioName,
} from "../../../examples/agents/support-ops-agent/agent-runner";
import type { ScenarioName } from "../../../examples/agents/support-ops-agent/types";
import type { ToolIntent } from "../../../examples/agents/support-ops-agent/types";

const agentLabRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
  "reviewer",
];

const DEFAULT_DEMO_API_KEY = "ag_test_seed_support_refund_demo_key";

export class SupportAgentLabError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "SupportAgentLabError";
  }
}

export function canUseSupportAgentLab(role: MembershipRole) {
  return hasRole(role, agentLabRoles);
}

export function listSupportAgentScenariosForLab() {
  return listSupportAgentScenarioMetadata();
}

export { isSupportAgentScenarioName };

function getDemoApiKey() {
  return process.env.AGENTGATE_DEMO_API_KEY ?? DEFAULT_DEMO_API_KEY;
}

function makeGatewayHeaders(apiKey: string) {
  return new Headers({
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "AgentGate Agent Lab",
  });
}

function safeActionId(value: string) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(0, 80);
}

class InternalGatewayAgentClient implements SupportAgentClient {
  constructor(private readonly apiKey: string) {}

  async check(intent: ToolIntent) {
    const parsedIntent = gatewayCheckRequestSchema.parse(intent);
    const idempotencyKey = [
      "agent-lab",
      safeActionId(String(intent.metadata.ticketId ?? "ticket")),
      safeActionId(intent.action),
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 8),
    ].join("-");

    return gatewayService.check(
      parsedIntent,
      makeGatewayHeaders(this.apiKey),
      idempotencyKey,
    );
  }

  async execute(actionRequestId: string) {
    const input: GatewayActionRequest = { actionRequestId };

    return gatewayService.execute(input, makeGatewayHeaders(this.apiKey));
  }
}

export async function runSupportAgentLabScenario(input: {
  organizationId: string;
  role: MembershipRole;
  scenarioName: ScenarioName;
}) {
  if (!canUseSupportAgentLab(input.role)) {
    throw new SupportAgentLabError("You do not have access to Agent Lab.", 403);
  }

  const agent = await prisma.agent.findFirst({
    where: {
      organizationId: input.organizationId,
      slug: "support-refund-agent",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!agent) {
    throw new SupportAgentLabError(
      "Support Refund Agent is not available in this organization.",
      404,
    );
  }

  const demoApiKey = getDemoApiKey();
  const demoApiKeyRecord = await prisma.apiKey.findFirst({
    where: {
      organizationId: input.organizationId,
      keyHash: hashApiKey(demoApiKey),
      status: "ACTIVE",
    },
    select: {
      id: true,
      keyPrefix: true,
    },
  });

  if (!demoApiKeyRecord) {
    throw new SupportAgentLabError(
      "Demo API key is not available for this organization.",
      404,
    );
  }

  const result = await runSupportAgentScenario({
    agentId: agent.slug,
    client: new InternalGatewayAgentClient(demoApiKey),
    mode: "browser-agent-lab",
    scenarioName: input.scenarioName,
  });

  return {
    ...result,
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
    },
    keyPrefix: demoApiKeyRecord.keyPrefix,
    links: {
      action: `/actions/${result.decision.actionRequestId}`,
      approval:
        result.decision.decision === ActionDecision.REQUIRE_APPROVAL &&
        result.decision.approvalRequestId
          ? `/approvals/${result.decision.approvalRequestId}`
          : null,
      auditLogs: "/audit-logs",
    },
  };
}

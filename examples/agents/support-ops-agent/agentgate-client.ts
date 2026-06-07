import type {
  GatewayActionStatusResponse,
  GatewayDecisionResponse,
  GatewayExecutionResponse,
  ToolIntent,
} from "./types";

type ClientOptions = {
  apiKey: string;
  baseUrl: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && body.error
        ? body.error
        : `AgentGate request failed with HTTP ${response.status}.`;

    throw new Error(message);
  }

  return body as T;
}

export class AgentGateClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly runId: string;

  constructor(options: ClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async check(intent: ToolIntent): Promise<GatewayDecisionResponse> {
    const response = await fetch(`${this.baseUrl}/api/gateway/check`, {
      body: JSON.stringify(intent),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${intent.metadata.ticketId}-${intent.action}-${this.runId}`,
      },
      method: "POST",
    });

    return parseJsonResponse<GatewayDecisionResponse>(response);
  }

  async execute(actionRequestId: string): Promise<GatewayExecutionResponse> {
    const response = await fetch(`${this.baseUrl}/api/gateway/execute`, {
      body: JSON.stringify({ actionRequestId }),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    return parseJsonResponse<GatewayExecutionResponse>(response);
  }

  async getActionStatus(
    actionRequestId: string,
  ): Promise<GatewayActionStatusResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/gateway/actions/${encodeURIComponent(actionRequestId)}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        method: "GET",
      },
    );

    return parseJsonResponse<GatewayActionStatusResponse>(response);
  }
}

export class MockAgentGateClient {
  async check(intent: ToolIntent): Promise<GatewayDecisionResponse> {
    const isBlocked = intent.action.includes("delete");
    const requiresApproval =
      intent.amount != null && intent.amount > 500
        ? true
        : intent.externalCommunication === true ||
          (intent.tool === "postgres" && intent.environment === "production");

    const decision = isBlocked
      ? "BLOCK"
      : requiresApproval
        ? "REQUIRE_APPROVAL"
        : "LOG_ONLY";
    const status = isBlocked
      ? "BLOCKED"
      : requiresApproval
        ? "PENDING_APPROVAL"
        : "ALLOWED";
    const actuallyRequiresApproval = !isBlocked && requiresApproval;

    return {
      actionRequestId: `dry-run-${intent.metadata.ticketId}`,
      decision,
      allowed: status === "ALLOWED",
      requiresApproval: actuallyRequiresApproval,
      approvalRequestId: actuallyRequiresApproval
        ? `dry-run-approval-${intent.metadata.ticketId}`
        : undefined,
      risk: {
        score: isBlocked ? 95 : requiresApproval ? 72 : 18,
        level: isBlocked ? "CRITICAL" : requiresApproval ? "HIGH" : "LOW",
        signals: [
          intent.tool,
          intent.action,
          intent.environment,
          ...(intent.amount ? ["money_movement"] : []),
        ],
        explanation:
          "Dry-run mock response. Live mode delegates this decision to AgentGate.",
      },
      reason: isBlocked
        ? "Dry-run mock blocked destructive action."
        : requiresApproval
          ? "Dry-run mock requires approval for risky action."
          : "Dry-run mock allowed low-risk action.",
      status,
    };
  }

  async execute(actionRequestId: string): Promise<GatewayExecutionResponse> {
    return {
      actionRequestId,
      executed: true,
      status: "EXECUTED",
      result: {
        executor: "mock-agentgate-client",
        message: "Dry-run simulated execution.",
        output: {
          dryRun: true,
          simulatedExecutionId: `dry-run-exec-${actionRequestId}`,
        },
        simulated: true,
        success: true,
      },
    };
  }

  async getActionStatus(
    actionRequestId: string,
  ): Promise<GatewayActionStatusResponse> {
    return {
      actionRequestId,
      decision: "REQUIRE_APPROVAL",
      status: "PENDING_APPROVAL",
      requiresApproval: true,
      approvalRequest: {
        id: `dry-run-approval-${actionRequestId}`,
        requiredRole: "reviewer",
        status: "PENDING",
      },
      risk: {
        score: 72,
        level: "HIGH",
        signals: ["dry_run"],
        explanation: "Dry-run mock status response.",
      },
      reason: "Dry-run mock action is still waiting for approval.",
    };
  }
}

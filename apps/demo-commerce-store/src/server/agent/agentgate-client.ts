import { readAdminConfig } from "@/lib/store";

export type AgentGateCheckInput = {
  action: string;
  amount?: number;
  currency?: string;
  dataSensitivity?: string;
  environment?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  reason: string;
  tool: string;
  reversible?: boolean;
  externalCommunication?: boolean;
};

export async function checkWithAgentGate(input: AgentGateCheckInput) {
  const config = readAdminConfig();

  if (!config.agentGateApiKey) {
    throw new Error("AgentGate is not configured. Save the local demo API key in Admin API settings.");
  }

  const response = await fetch(`${config.agentGateBaseUrl.replace(/\/$/, "")}/api/gateway/check`, {
    body: JSON.stringify({
      agentId: config.agentId,
      action: input.action,
      amount: input.amount,
      currency: input.currency,
      dataSensitivity: input.dataSensitivity,
      environment: input.environment ?? config.environment,
      externalCommunication: input.externalCommunication,
      metadata: {
        source: "northstar-demo-store",
        customerFacing: true,
        ...(input.metadata ?? {}),
      },
      payload: input.payload ?? {},
      reason: input.reason,
      reversible: input.reversible,
      tool: input.tool,
    }),
    headers: {
      Authorization: `Bearer ${config.agentGateApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(String(body.error ?? body.message ?? "AgentGate check failed."));
  }

  return body as {
    actionRequestId: string;
    approvalRequestId?: string;
    decision: string;
    reason: string;
    status: string;
    risk: {
      level: string;
      score: number;
      signals: string[];
      explanation: string;
    };
  };
}

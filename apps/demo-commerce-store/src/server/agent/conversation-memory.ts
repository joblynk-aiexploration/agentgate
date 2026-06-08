import { addAgentLog } from "@/lib/store";
import type { AgentChatInput, AgentChatResponse } from "@/server/agent/types";

function orderNumberFromUpdate(update: unknown) {
  if (update && typeof update === "object" && "number" in update) {
    const value = (update as { number?: unknown }).number;
    return typeof value === "string" ? value : undefined;
  }

  return undefined;
}

export function rememberConversation(input: AgentChatInput, response: AgentChatResponse) {
  addAgentLog({
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action: response.agentGateDecision?.decision ? response.intent : undefined,
    actionRequestId: response.agentGateDecision?.actionRequestId,
    approvalRequestId: response.agentGateDecision?.approvalRequestId,
    customerEmail: input.customer?.email,
    decision: response.agentGateDecision?.decision,
    intent: response.intent,
    message: input.message,
    orderNumber: orderNumberFromUpdate(response.orderUpdate),
    result: response.reply,
    riskLevel: response.agentGateDecision?.riskLevel,
    riskScore: response.agentGateDecision?.riskScore,
    sessionId: input.sessionId,
    status:
      response.agentGateDecision?.decision === "REQUIRE_APPROVAL"
        ? "pending_approval"
        : response.agentGateDecision?.decision === "BLOCK"
          ? "blocked"
          : "answered",
    timestamp: new Date().toISOString(),
  });
}

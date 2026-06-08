import { addAgentLog } from "@/lib/store";
import type { AgentChatInput, AgentChatResponse } from "@/server/agent/types";

export function rememberConversation(input: AgentChatInput, response: AgentChatResponse) {
  addAgentLog({
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action: response.agentGateDecision?.decision ? response.intent : undefined,
    actionRequestId: response.agentGateDecision?.actionRequestId,
    approvalRequestId: response.agentGateDecision?.approvalRequestId,
    decision: response.agentGateDecision?.decision,
    intent: response.intent,
    message: input.message,
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

import { AgentGateClient } from "@/sdk";

export async function runSupportRefundAgentDemo() {
  const agentgate = new AgentGateClient({
    apiKey: process.env.AGENTGATE_API_KEY!,
    baseUrl: process.env.AGENTGATE_BASE_URL ?? "http://localhost:3000",
  });

  const decision = await agentgate.check({
    agentId: "support-refund-agent",
    tool: "stripe",
    action: "refund.create",
    environment: "production",
    amount: 1200,
    currency: "USD",
    reason: "Customer was double charged",
    idempotencyKey: "support-refund-agent-demo-1200",
  });

  if (decision.decision === "BLOCK") {
    return {
      decision,
      message: "AgentGate blocked the refund request.",
    };
  }

  if (decision.requiresApproval) {
    return {
      decision,
      message: "AgentGate routed the refund request to the Approval Inbox.",
    };
  }

  const execution = await agentgate.execute(decision.actionRequestId);

  return {
    decision,
    execution,
    message: "AgentGate allowed and simulated the refund execution.",
  };
}

if (process.env.RUN_AGENTGATE_SDK_EXAMPLE === "true") {
  runSupportRefundAgentDemo()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}

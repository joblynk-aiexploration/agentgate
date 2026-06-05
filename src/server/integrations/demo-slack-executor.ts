import type {
  ToolExecutionInput,
  ToolExecutionResult,
  ToolExecutor,
} from "@/server/integrations/types";

function payloadRecord(payload: unknown) {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

export class DemoSlackExecutor implements ToolExecutor {
  async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    const payload = payloadRecord(input.payload);

    return {
      executor: "slack_demo",
      message: "Simulated Slack message. No Slack API call was made.",
      output: {
        channel:
          typeof payload.channel === "string" ? payload.channel : "#agentgate-demo",
        messageId: `sim_slack_${input.actionRequestId.slice(0, 12)}`,
        text:
          typeof payload.text === "string"
            ? payload.text.slice(0, 500)
            : input.reason.slice(0, 500),
      },
      simulated: true,
      success: true,
    };
  }
}

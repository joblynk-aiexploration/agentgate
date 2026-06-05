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

export class DemoWebhookExecutor implements ToolExecutor {
  async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    const payload = payloadRecord(input.payload);

    return {
      executor: "webhook_demo",
      message: "Simulated webhook delivery. No external URL was called.",
      output: {
        deliveryId: `sim_wh_${input.actionRequestId.slice(0, 12)}`,
        target:
          typeof payload.url === "string"
            ? "configured-in-payload-redacted"
            : "demo-endpoint",
      },
      simulated: true,
      success: true,
    };
  }
}

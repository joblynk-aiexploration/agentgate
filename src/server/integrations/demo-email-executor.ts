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

export class DemoEmailExecutor implements ToolExecutor {
  async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    const payload = payloadRecord(input.payload);

    return {
      executor: "email_preview",
      message: "Simulated email preview. No email was sent.",
      output: {
        previewId: `sim_email_${input.actionRequestId.slice(0, 12)}`,
        subject:
          typeof payload.subject === "string"
            ? payload.subject.slice(0, 160)
            : "Untitled preview",
        to:
          typeof payload.to === "string"
            ? payload.to
            : Array.isArray(payload.to)
              ? payload.to.filter((item) => typeof item === "string").slice(0, 5)
              : null,
      },
      simulated: true,
      success: true,
    };
  }
}

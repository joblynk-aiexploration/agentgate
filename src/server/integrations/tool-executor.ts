import { ToolType } from "@/generated/prisma/client";
import { DemoEmailExecutor } from "@/server/integrations/demo-email-executor";
import { DemoPostgresExecutor } from "@/server/integrations/demo-postgres-executor";
import { DemoSlackExecutor } from "@/server/integrations/demo-slack-executor";
import { DemoStripeExecutor } from "@/server/integrations/demo-stripe-executor";
import { DemoWebhookExecutor } from "@/server/integrations/demo-webhook-executor";
import type {
  ToolExecutionInput,
  ToolExecutionResult,
  ToolExecutor,
} from "@/server/integrations/types";

const executors: Partial<Record<ToolType, ToolExecutor>> = {
  [ToolType.EMAIL_PREVIEW]: new DemoEmailExecutor(),
  [ToolType.GMAIL]: new DemoEmailExecutor(),
  [ToolType.POSTGRES]: new DemoPostgresExecutor(),
  [ToolType.SLACK]: new DemoSlackExecutor(),
  [ToolType.STRIPE]: new DemoStripeExecutor(),
  [ToolType.WEBHOOK]: new DemoWebhookExecutor(),
};

export function getToolExecutor(tool: ToolType): ToolExecutor {
  return (
    executors[tool] ?? {
      async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
        return {
          executor: "demo_noop",
          message:
            "No V1 demo executor is configured for this tool. No external action was performed.",
          output: {
            action: input.action,
            tool: input.tool,
          },
          simulated: true,
          success: true,
        };
      },
    }
  );
}

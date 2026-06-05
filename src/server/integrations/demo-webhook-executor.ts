import type {
  ToolExecutor,
} from "@/server/integrations/types";
import { createWebhookDemoDeliveryResult } from "@/server/integrations/webhook-demo";
import type {
  ToolExecutionInput,
  ToolExecutionResult,
} from "@/server/integrations/types";

export class DemoWebhookExecutor implements ToolExecutor {
  async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    return createWebhookDemoDeliveryResult(input);
  }
}

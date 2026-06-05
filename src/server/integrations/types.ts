import type { ToolType } from "@/generated/prisma/client";

export type ToolExecutionInput = {
  action: string;
  actionRequestId: string;
  agentId: string;
  environment: string;
  metadata: unknown;
  organizationId: string;
  payload: unknown;
  reason: string;
  tool: ToolType;
};

export type ToolExecutionResult = {
  executor: string;
  message: string;
  output: Record<string, unknown>;
  simulated: true;
  success: boolean;
};

export interface ToolExecutor {
  execute(input: ToolExecutionInput): Promise<ToolExecutionResult>;
}

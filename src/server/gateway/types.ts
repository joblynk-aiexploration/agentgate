import { z } from "zod";
import {
  ActionDecision,
  ActionStatus,
  RiskLevel,
  ToolType,
} from "@/generated/prisma/client";
import type { ToolExecutionResult } from "@/server/integrations/types";

const toolValues = Object.values(ToolType) as [ToolType, ...ToolType[]];

function normalizeTool(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toUpperCase().replaceAll("-", "_");
}

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const gatewayCheckRequestSchema = z.object({
  agentId: z.string().trim().min(1),
  tool: z.preprocess(normalizeTool, z.enum(toolValues)),
  action: z.string().trim().min(1).max(160),
  environment: z.string().trim().min(1).max(80).default("production"),
  amount: z.number().finite().nonnegative().optional().nullable(),
  currency: z.string().trim().max(12).optional().nullable(),
  reason: z.string().trim().max(1000).optional().nullable(),
  payload: jsonRecordSchema.default({}),
  metadata: jsonRecordSchema.default({}),
  dataSensitivity: z.string().trim().max(40).optional().nullable(),
  reversible: z.boolean().optional().nullable(),
  externalCommunication: z.boolean().optional().nullable(),
  productionEnvironment: z.boolean().optional().nullable(),
});

export const gatewayActionRequestSchema = z.object({
  actionRequestId: z.string().trim().min(1),
});

export const toolProxyRequestBodySchema = gatewayCheckRequestSchema.omit({
  tool: true,
  action: true,
});

export type GatewayCheckRequest = z.infer<typeof gatewayCheckRequestSchema>;
export type GatewayActionRequest = z.infer<typeof gatewayActionRequestSchema>;
export type ToolProxyRequestBody = z.infer<typeof toolProxyRequestBodySchema>;

export type GatewayRiskResponse = {
  score: number;
  level: RiskLevel;
  signals: string[];
  explanation: string;
};

export type GatewayDecisionResponse = {
  actionRequestId: string;
  decision: ActionDecision;
  allowed: boolean;
  requiresApproval: boolean;
  approvalRequestId?: string;
  risk: GatewayRiskResponse;
  reason: string;
  status: ActionStatus;
};

export type GatewayExecutionResponse = {
  actionRequestId: string;
  status: ActionStatus;
  executed: boolean;
  result: ToolExecutionResult;
};

export type GatewayCancelResponse = {
  actionRequestId: string;
  status: ActionStatus;
  cancelled: boolean;
};

export type ToolProxyResponse = GatewayDecisionResponse & {
  executed: boolean;
  mode: "tool_proxy";
  result?: ToolExecutionResult;
};

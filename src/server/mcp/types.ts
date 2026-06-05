import type { ActionDecision, RiskLevel, ToolType } from "@/generated/prisma/client";

export type McpGatewayMode = "disabled" | "gateway_api" | "tool_proxy" | "future_mcp";

export type McpToolDefinition = {
  name: string;
  description: string;
  tool: ToolType;
  action: string;
  inputSchema: Record<string, unknown>;
  mode: McpGatewayMode;
};

export type McpToolCallRequest = {
  agentId: string;
  toolName: string;
  tool: ToolType;
  action: string;
  environment: string;
  reason?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type McpToolCallDecision = {
  actionRequestId?: string;
  approvalRequestId?: string;
  decision: ActionDecision;
  mode: McpGatewayMode;
  reason: string;
  requiresApproval: boolean;
  risk?: {
    explanation: string;
    level: RiskLevel;
    score: number;
    signals: string[];
  };
};

import { ToolType } from "@/generated/prisma/client";
import type {
  McpGatewayMode,
  McpToolDefinition,
} from "@/server/mcp/types";

export const mcpGatewayMode: McpGatewayMode = "disabled";

export const demoMcpToolDefinitions: McpToolDefinition[] = [
  {
    name: "agentgate.stripe.refund_create",
    description:
      "Future MCP-facing refund tool. V1 routes equivalent requests through Gateway API or Tool Proxy mode only.",
    tool: ToolType.STRIPE,
    action: "refund.create",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number" },
        currency: { type: "string" },
        reason: { type: "string" },
      },
      required: ["amount", "currency", "reason"],
    },
    mode: "future_mcp",
  },
  {
    name: "agentgate.webhook.trigger",
    description:
      "Future MCP-facing webhook trigger. V1 simulates webhook delivery through Tool Proxy mode.",
    tool: ToolType.WEBHOOK,
    action: "webhook.trigger",
    inputSchema: {
      type: "object",
      properties: {
        event: { type: "string" },
        target: { type: "string" },
        body: { type: "object" },
      },
      required: ["event"],
    },
    mode: "future_mcp",
  },
];

export function describeMcpGatewayPlaceholder() {
  return {
    enabled: false,
    mode: mcpGatewayMode,
    message:
      "AgentGate V1 does not run a full MCP server. Use Gateway API or Tool Proxy mode for demo tool calls.",
    supportedV1Modes: ["gateway_api", "tool_proxy"] satisfies McpGatewayMode[],
  };
}

export function assertMcpGatewayUnavailable(): never {
  throw new Error(
    "AgentGate MCP Gateway is a future placeholder in V1. Route tool calls through Gateway API or Tool Proxy mode.",
  );
}

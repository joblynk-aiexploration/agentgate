import { z } from "zod";
import type { MembershipRole } from "@/generated/prisma/client";
import type {
  ToolExecutionInput,
  ToolExecutionResult,
} from "@/server/integrations/types";

export const webhookDemoManagerRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
];

export const webhookDemoActions = [
  "webhook.trigger",
  "webhook.notify",
  "webhook.enqueue",
] as const;

export const webhookDemoConfigSchema = z.object({
  description: z.string().trim().max(500).optional().default(""),
  name: z.string().trim().min(2).max(80),
});

export type WebhookDemoConfig = z.infer<typeof webhookDemoConfigSchema>;

export const webhookDemoExamplePayload = {
  agentId: "support-refund-agent",
  tool: "webhook",
  action: "webhook.trigger",
  environment: "production",
  reason: "Notify an internal workflow after approval",
  payload: {
    event: "refund.approved",
    target: "demo-workflow",
    body: {
      action: "refund.create",
      amount: 1200,
      currency: "USD",
    },
  },
  metadata: {
    source: "agentgate-demo",
  },
};

function payloadRecord(payload: unknown) {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

export function isWebhookDemoAction(action: string) {
  return webhookDemoActions.includes(action as (typeof webhookDemoActions)[number]);
}

export function parseWebhookDemoConfig(value: unknown): WebhookDemoConfig {
  const parsed = webhookDemoConfigSchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  return {
    description: "Demo-only webhook integration for simulated delivery.",
    name: "Webhook Demo",
  };
}

export function createWebhookDemoDeliveryResult(
  input: ToolExecutionInput,
): ToolExecutionResult {
  const payload = payloadRecord(input.payload);
  const config = parseWebhookDemoConfig(input.toolConnectionConfig);
  const deliveryId = `sim_wh_${input.actionRequestId.slice(0, 12)}`;

  return {
    executor: "webhook_demo",
    message: isWebhookDemoAction(input.action)
      ? "Simulated webhook delivery. No external URL was called."
      : "Simulated generic webhook action. No external URL was called.",
    output: {
      action: input.action,
      deliveryId,
      demoDescription: config.description,
      demoName: config.name,
      event: typeof payload.event === "string" ? payload.event : null,
      simulatedEndpoint: "demo://agentgate/webhook",
      target:
        typeof payload.target === "string"
          ? payload.target
          : typeof payload.url === "string"
            ? "payload-url-redacted"
            : "demo-target",
    },
    simulated: true,
    success: true,
  };
}

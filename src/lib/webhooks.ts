import { createHmac } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  WebhookEndpointStatus,
  type MembershipRole,
  type Prisma,
} from "@/generated/prisma/client";
import { createAuditLog, summarizeAuditMetadata } from "@/server/audit/audit-service";
import { getCurrentMembership } from "@/lib/auth";
import { env } from "@/lib/env";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type {
  outboundWebhookEventValues,
  webhookEndpointInputSchema,
  webhookEndpointPatchSchema,
} from "@/lib/validators";
import type { z } from "zod";

export type OutboundWebhookEvent = (typeof outboundWebhookEventValues)[number];
export type WebhookEndpointInput = z.infer<typeof webhookEndpointInputSchema>;
export type WebhookEndpointPatchInput = z.infer<typeof webhookEndpointPatchSchema>;
export type WebhookMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;

type DispatchWebhookEventInput = {
  organizationId: string;
  event: OutboundWebhookEvent;
  targetType: string;
  targetId: string;
  metadata?: unknown;
};

const webhookViewRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
  "auditor",
];
const webhookManageRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "developer",
];
const webhookDisableRoles: MembershipRole[] = [
  "platform_owner",
  "org_owner",
  "security_admin",
  "developer",
];

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function parseEvents(value: unknown): OutboundWebhookEvent[] {
  return Array.isArray(value)
    ? value.filter((event): event is OutboundWebhookEvent => typeof event === "string")
    : [];
}

function hashWebhookSecret(secret: string) {
  return createHmac("sha256", env.ENCRYPTION_KEY).update(secret).digest("hex");
}

function buildWebhookPayload(input: DispatchWebhookEventInput) {
  return {
    event: input.event,
    organizationId: input.organizationId,
    timestamp: new Date().toISOString(),
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: {
      summary: summarizeAuditMetadata(input.metadata ?? null),
    },
  };
}

function signPayload(payload: unknown, secretHash: string | null) {
  if (!secretHash) {
    return null;
  }

  return createHmac("sha256", secretHash)
    .update(JSON.stringify(payload))
    .digest("hex");
}

function actualDeliveryEnabled() {
  return process.env.AGENTGATE_ENABLE_OUTBOUND_WEBHOOKS === "true";
}

export function canViewWebhooks(role: MembershipRole) {
  return hasRole(role, webhookViewRoles);
}

export function canManageWebhooks(role: MembershipRole) {
  return hasRole(role, webhookManageRoles);
}

export function canDisableWebhooks(role: MembershipRole) {
  return hasRole(role, webhookDisableRoles);
}

export async function getWebhookViewerMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canViewWebhooks(membership.role)) {
    return null;
  }

  return membership;
}

export async function getWebhookManagerMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canManageWebhooks(membership.role)) {
    return null;
  }

  return membership;
}

export async function listWebhookEndpoints(membership: WebhookMembership) {
  return prisma.webhookEndpoint.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      url: true,
      status: true,
      eventsJson: true,
      secretHash: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createWebhookEndpoint(
  membership: WebhookMembership,
  input: WebhookEndpointInput,
) {
  if (!canManageWebhooks(membership.role)) {
    throw new Error("You are not allowed to manage webhooks.");
  }

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      organizationId: membership.organizationId,
      createdById: membership.userId,
      name: input.name,
      url: input.url,
      secretHash: input.secret ? hashWebhookSecret(input.secret) : null,
      status: input.status,
      eventsJson: input.events,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "webhook.created",
    targetType: "WebhookEndpoint",
    targetId: endpoint.id,
    metadataJson: {
      name: endpoint.name,
      status: endpoint.status,
      events: input.events,
      hasSecret: Boolean(endpoint.secretHash),
    },
  });

  revalidatePath("/developer/webhooks");

  return endpoint;
}

export async function updateWebhookEndpoint(
  membership: WebhookMembership,
  endpointId: string,
  input: WebhookEndpointPatchInput,
) {
  const existing = await prisma.webhookEndpoint.findFirst({
    where: {
      id: endpointId,
      organizationId: membership.organizationId,
    },
  });

  if (!existing) {
    throw new Error("Webhook endpoint not found.");
  }

  const onlyDisabling =
    Object.keys(input).length === 1 &&
    input.status === WebhookEndpointStatus.DISABLED;

  if (!canManageWebhooks(membership.role) && !(onlyDisabling && canDisableWebhooks(membership.role))) {
    throw new Error("You are not allowed to update this webhook.");
  }

  const endpoint = await prisma.webhookEndpoint.update({
    where: {
      id: existing.id,
      organizationId: membership.organizationId,
    },
    data: {
      name: input.name,
      url: input.url,
      status: input.status,
      eventsJson: input.events ? toInputJson(input.events) : undefined,
      secretHash:
        "secret" in input
          ? input.secret
            ? hashWebhookSecret(input.secret)
            : null
          : undefined,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "webhook.updated",
    targetType: "WebhookEndpoint",
    targetId: endpoint.id,
    metadataJson: {
      name: endpoint.name,
      status: endpoint.status,
      events: parseEvents(endpoint.eventsJson),
      hasSecret: Boolean(endpoint.secretHash),
    },
  });

  revalidatePath("/developer/webhooks");

  return endpoint;
}

export async function deleteWebhookEndpoint(
  membership: WebhookMembership,
  endpointId: string,
) {
  if (!canManageWebhooks(membership.role)) {
    throw new Error("You are not allowed to delete webhooks.");
  }

  const existing = await prisma.webhookEndpoint.findFirst({
    where: {
      id: endpointId,
      organizationId: membership.organizationId,
    },
  });

  if (!existing) {
    throw new Error("Webhook endpoint not found.");
  }

  await prisma.webhookEndpoint.delete({
    where: {
      id: existing.id,
      organizationId: membership.organizationId,
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "webhook.deleted",
    targetType: "WebhookEndpoint",
    targetId: existing.id,
    metadataJson: {
      name: existing.name,
      status: existing.status,
    },
  });

  revalidatePath("/developer/webhooks");

  return { id: existing.id };
}

export async function testWebhookEndpoint(
  membership: WebhookMembership,
  endpointId: string,
) {
  if (!canManageWebhooks(membership.role)) {
    throw new Error("You are not allowed to test webhooks.");
  }

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: {
      id: endpointId,
      organizationId: membership.organizationId,
    },
  });

  if (!endpoint) {
    throw new Error("Webhook endpoint not found.");
  }

  const result = await deliverToEndpoint(endpoint, {
    event: "gateway.action_checked",
    organizationId: membership.organizationId,
    targetType: "WebhookEndpoint",
    targetId: endpoint.id,
    metadata: {
      simulated: true,
      source: "webhook_test",
    },
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "webhook.tested",
    targetType: "WebhookEndpoint",
    targetId: endpoint.id,
    metadataJson: {
      mode: result.mode,
      event: result.payload.event,
      url: endpoint.url,
      signed: Boolean(result.signature),
    },
  });

  return result;
}

async function deliverToEndpoint(
  endpoint: {
    id: string;
    name: string;
    organizationId: string;
    secretHash: string | null;
    url: string;
  },
  input: DispatchWebhookEventInput,
) {
  const payload = buildWebhookPayload(input);
  const signature = signPayload(payload, endpoint.secretHash);

  if (!actualDeliveryEnabled()) {
    return {
      mode: "simulated" as const,
      endpointId: endpoint.id,
      payload,
      signature,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(endpoint.url, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "X-AgentGate-Event": payload.event,
        ...(signature ? { "X-AgentGate-Signature": signature } : {}),
      },
      method: "POST",
      signal: controller.signal,
    });

    return {
      mode: "delivered" as const,
      endpointId: endpoint.id,
      payload,
      signature,
      status: response.status,
    };
  } catch (error) {
    return {
      mode: "failed" as const,
      endpointId: endpoint.id,
      payload,
      signature,
      errorType: error instanceof Error ? error.name : typeof error,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchWebhookEvent(input: DispatchWebhookEventInput) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      organizationId: input.organizationId,
      status: WebhookEndpointStatus.ACTIVE,
    },
  });
  const matched = endpoints.filter((endpoint) =>
    parseEvents(endpoint.eventsJson).includes(input.event),
  );

  const results = await Promise.all(
    matched.map(async (endpoint) => {
      const result = await deliverToEndpoint(endpoint, input);

      await createAuditLog({
        organizationId: input.organizationId,
        actorType: "system",
        actorId: null,
        eventType:
          result.mode === "delivered"
            ? "webhook.delivery_sent"
            : result.mode === "failed"
              ? "webhook.delivery_failed"
              : "webhook.delivery_simulated",
        targetType: input.targetType,
        targetId: input.targetId,
        metadataJson: {
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          event: input.event,
          mode: result.mode,
          signed: Boolean(result.signature),
          status: "status" in result ? result.status : undefined,
          errorType: "errorType" in result ? result.errorType : undefined,
        },
      });

      return result;
    }),
  );

  return results;
}

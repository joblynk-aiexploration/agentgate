import { ApiKeyStatus } from "@/generated/prisma/client";
import { createAuditLog } from "@/server/audit/audit-service";
import { hashApiKey } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  gatewayAuthError,
  gatewayRateLimitError,
} from "@/server/gateway/errors";
import { getRequestIp } from "@/server/gateway/idempotency";
import { checkGatewayRateLimit } from "@/server/gateway/rate-limit";

function getBearerToken(headers: Headers) {
  const authorization = headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw gatewayAuthError();
  }

  if (!token.startsWith("ag_test_") || /\s/.test(token)) {
    throw gatewayAuthError();
  }

  return token;
}

async function auditGatewayAuthFailed(input: {
  apiKeyId?: string | null;
  organizationId?: string | null;
  reason: string;
  headers: Headers;
}) {
  try {
    await createAuditLog({
      organizationId: input.organizationId ?? null,
      actorType: "api_key",
      actorId: input.apiKeyId ?? null,
      eventType: "gateway.auth_failed",
      targetType: input.apiKeyId ? "ApiKey" : "Gateway",
      targetId: input.apiKeyId ?? null,
      metadataJson: {
        reason: input.reason,
      },
      ipAddress: getRequestIp(input.headers),
      userAgent: input.headers.get("user-agent"),
    });
  } catch (error) {
    console.error("Gateway auth failure audit could not be written", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
  }
}

export async function authenticateApiKey(headers: Headers) {
  const ip = getRequestIp(headers);
  const ipRateLimit = checkGatewayRateLimit(`ip:${ip}`);

  if (!ipRateLimit.allowed) {
    throw gatewayRateLimitError();
  }

  let token: string;

  try {
    token = getBearerToken(headers);
  } catch (error) {
    await auditGatewayAuthFailed({
      reason: "missing_or_malformed_authorization",
      headers,
    });

    throw error;
  }

  const keyHash = hashApiKey(token);
  const keyRateLimit = checkGatewayRateLimit(`api-key:${keyHash}`);

  if (!keyRateLimit.allowed) {
    throw gatewayRateLimitError();
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: {
      keyHash,
    },
    select: {
      id: true,
      organizationId: true,
      agentId: true,
      status: true,
      expiresAt: true,
      organization: {
        select: {
          id: true,
          status: true,
          killSwitchEnabled: true,
        },
      },
    },
  });

  if (!apiKey) {
    await auditGatewayAuthFailed({
      reason: "invalid_api_key",
      headers,
    });

    throw gatewayAuthError();
  }

  if (apiKey.status !== ApiKeyStatus.ACTIVE) {
    await auditGatewayAuthFailed({
      apiKeyId: apiKey.id,
      organizationId: apiKey.organizationId,
      reason: "api_key_not_active",
      headers,
    });

    throw gatewayAuthError();
  }

  if (apiKey.expiresAt && apiKey.expiresAt <= new Date()) {
    await auditGatewayAuthFailed({
      apiKeyId: apiKey.id,
      organizationId: apiKey.organizationId,
      reason: "api_key_expired",
      headers,
    });

    throw gatewayAuthError();
  }

  await prisma.apiKey.update({
    where: {
      id: apiKey.id,
      organizationId: apiKey.organizationId,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });

  return {
    apiKey: {
      id: apiKey.id,
      organizationId: apiKey.organizationId,
      agentId: apiKey.agentId,
      organization: apiKey.organization,
    },
    keyHash,
  };
}

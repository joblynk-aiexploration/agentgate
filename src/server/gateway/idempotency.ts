import { createHash } from "node:crypto";
import { gatewayValidationError } from "@/server/gateway/errors";
import type { GatewayCheckRequest } from "@/server/gateway/types";

const IDEMPOTENCY_KEY_MAX_LENGTH = 160;
const IDEMPOTENCY_FINGERPRINT_VERSION = "gateway-check-v1";

export function getIdempotencyKey(headers: Headers) {
  const value = headers.get("Idempotency-Key");

  const key = value?.trim();

  if (!key) {
    return null;
  }

  if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH || /[\u0000-\u001f\u007f]/.test(key)) {
    throw gatewayValidationError("Invalid idempotency key.");
  }

  return key;
}

export function getRequestIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",").at(0)?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function createGatewayCheckFingerprint(input: GatewayCheckRequest) {
  const normalizedInput = {
    action: input.action,
    agentId: input.agentId,
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    dataSensitivity: input.dataSensitivity ?? null,
    environment: input.environment,
    externalCommunication: input.externalCommunication ?? null,
    metadata: input.metadata,
    payload: input.payload,
    productionEnvironment: input.productionEnvironment ?? null,
    reason: input.reason ?? null,
    reversible: input.reversible ?? null,
    tool: input.tool,
  };

  return createHash("sha256")
    .update(IDEMPOTENCY_FINGERPRINT_VERSION)
    .update(stableJson(normalizedInput))
    .digest("hex");
}

export function metadataWithIdempotencyFingerprint(
  metadata: Record<string, unknown>,
  fingerprint: string | null,
) {
  if (!fingerprint) {
    return metadata;
  }

  return {
    ...metadata,
    agentgateIdempotencyFingerprint: fingerprint,
  };
}

export function getStoredIdempotencyFingerprint(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).agentgateIdempotencyFingerprint;

  return typeof value === "string" ? value : null;
}

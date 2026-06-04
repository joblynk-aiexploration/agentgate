import { gatewayValidationError } from "@/server/gateway/errors";

const IDEMPOTENCY_KEY_MAX_LENGTH = 160;

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

import { NextResponse } from "next/server";

type GatewayErrorKind =
  | "auth"
  | "authorization"
  | "validation"
  | "not_found"
  | "rate_limit"
  | "state"
  | "internal";

export class GatewayError extends Error {
  constructor(
    public readonly status: number,
    public readonly publicMessage: string,
    public readonly kind: GatewayErrorKind = "internal",
  ) {
    super(publicMessage);
  }
}

export function gatewayErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof GatewayError) {
    return NextResponse.json(
      { error: error.publicMessage },
      { status: error.status },
    );
  }

  console.error(fallbackMessage, {
    errorType: error instanceof Error ? error.name : typeof error,
  });

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export function gatewayAuthError() {
  return new GatewayError(401, "Invalid gateway credentials.", "auth");
}

export function gatewayForbiddenError(message = "Gateway request is not allowed.") {
  return new GatewayError(403, message, "authorization");
}

export function gatewayValidationError(message: string) {
  return new GatewayError(400, message, "validation");
}

export function gatewayNotFoundError(message: string) {
  return new GatewayError(404, message, "not_found");
}

export function gatewayRateLimitError() {
  return new GatewayError(429, "Rate limit exceeded.", "rate_limit");
}

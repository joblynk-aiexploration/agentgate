import { NextResponse } from "next/server";
import { getIdempotencyKey } from "@/server/gateway/idempotency";
import { gatewayService, GatewayError } from "@/server/gateway/gateway-service";
import { gatewayCheckRequestSchema } from "@/server/gateway/types";

function errorResponse(error: unknown) {
  if (error instanceof GatewayError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Gateway check failed." }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = gatewayCheckRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const response = await gatewayService.check(
      parsed.data,
      request.headers,
      getIdempotencyKey(request.headers),
    );

    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}

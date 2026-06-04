import { NextResponse } from "next/server";
import { gatewayService, GatewayError } from "@/server/gateway/gateway-service";
import { gatewayActionRequestSchema } from "@/server/gateway/types";

function errorResponse(error: unknown) {
  if (error instanceof GatewayError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Gateway cancellation failed." }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = gatewayActionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const response = await gatewayService.cancel(parsed.data, request.headers);

    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}

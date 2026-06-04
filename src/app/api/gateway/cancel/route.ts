import { NextResponse } from "next/server";
import { gatewayErrorResponse } from "@/server/gateway/errors";
import { gatewayService } from "@/server/gateway/gateway-service";
import { gatewayActionRequestSchema } from "@/server/gateway/types";

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
    return gatewayErrorResponse(error, "Gateway cancellation failed.");
  }
}

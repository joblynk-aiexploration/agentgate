import { NextResponse } from "next/server";
import { gatewayErrorResponse } from "@/server/gateway/errors";
import { gatewayService } from "@/server/gateway/gateway-service";
import { gatewayActionRequestSchema } from "@/server/gateway/types";

type GatewayActionStatusRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: GatewayActionStatusRouteContext,
) {
  try {
    const { id } = await context.params;
    const parsed = gatewayActionRequestSchema.safeParse({
      actionRequestId: id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action request id.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const response = await gatewayService.getActionStatus(
      parsed.data,
      request.headers,
    );

    return NextResponse.json(response);
  } catch (error) {
    return gatewayErrorResponse(error, "Gateway action status failed.");
  }
}

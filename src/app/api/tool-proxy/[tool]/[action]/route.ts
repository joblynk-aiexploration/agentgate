import { NextResponse } from "next/server";
import { gatewayErrorResponse } from "@/server/gateway/errors";
import { gatewayService } from "@/server/gateway/gateway-service";
import { getIdempotencyKey } from "@/server/gateway/idempotency";
import {
  gatewayCheckRequestSchema,
  toolProxyRequestBodySchema,
} from "@/server/gateway/types";

type ToolProxyRouteContext = {
  params: Promise<{
    action: string;
    tool: string;
  }>;
};

export async function POST(request: Request, context: ToolProxyRouteContext) {
  try {
    const params = await context.params;
    const toolAction = gatewayCheckRequestSchema
      .pick({
        tool: true,
        action: true,
      })
      .safeParse({
        tool: decodeURIComponent(params.tool),
        action: decodeURIComponent(params.action),
      });

    if (!toolAction.success) {
      return NextResponse.json(
        { error: "Invalid tool proxy route.", issues: toolAction.error.flatten() },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsedBody = toolProxyRequestBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const response = await gatewayService.proxyToolCall(
      {
        ...parsedBody.data,
        tool: toolAction.data.tool,
        action: toolAction.data.action,
      },
      request.headers,
      getIdempotencyKey(request.headers),
    );

    return NextResponse.json(response);
  } catch (error) {
    return gatewayErrorResponse(error, "Tool proxy request failed.");
  }
}

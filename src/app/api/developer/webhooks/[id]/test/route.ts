import { NextResponse } from "next/server";
import { getWebhookViewerMembership, testWebhookEndpoint } from "@/lib/webhooks";

type WebhookTestRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: WebhookTestRouteContext) {
  const membership = await getWebhookViewerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    return NextResponse.json({
      delivery: await testWebhookEndpoint(membership, id),
    });
  } catch (error) {
    console.error("Webhook test failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      { error: "Webhook test failed." },
      { status: 403 },
    );
  }
}

import { NextResponse } from "next/server";
import {
  createWebhookEndpoint,
  getWebhookManagerMembership,
  getWebhookViewerMembership,
  listWebhookEndpoints,
} from "@/lib/webhooks";
import { webhookEndpointInputSchema } from "@/lib/validators";

export async function GET() {
  const membership = await getWebhookViewerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhooks = await listWebhookEndpoints(membership);

  return NextResponse.json({
    webhooks: webhooks.map(({ secretHash, ...webhook }) => ({
      ...webhook,
      hasSecret: Boolean(secretHash),
    })),
  });
}

export async function POST(request: Request) {
  const membership = await getWebhookManagerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = webhookEndpointInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const webhook = await createWebhookEndpoint(membership, parsed.data);

    return NextResponse.json(
      {
        webhook: {
          ...webhook,
          hasSecret: Boolean(webhook.secretHash),
          secretHash: undefined,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Webhook creation failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      { error: "Webhook creation failed." },
      { status: 400 },
    );
  }
}

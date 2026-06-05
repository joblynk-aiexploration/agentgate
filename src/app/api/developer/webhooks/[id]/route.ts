import { NextResponse } from "next/server";
import {
  deleteWebhookEndpoint,
  getWebhookViewerMembership,
  updateWebhookEndpoint,
} from "@/lib/webhooks";
import { webhookEndpointPatchSchema } from "@/lib/validators";

type WebhookRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: WebhookRouteContext) {
  const membership = await getWebhookViewerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = webhookEndpointPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const webhook = await updateWebhookEndpoint(membership, id, parsed.data);

    return NextResponse.json({
      webhook: {
        ...webhook,
        hasSecret: Boolean(webhook.secretHash),
        secretHash: undefined,
      },
    });
  } catch (error) {
    console.error("Webhook update failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      { error: "Webhook update failed." },
      { status: 403 },
    );
  }
}

export async function DELETE(_request: Request, context: WebhookRouteContext) {
  const membership = await getWebhookViewerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    return NextResponse.json({
      webhook: await deleteWebhookEndpoint(membership, id),
    });
  } catch (error) {
    console.error("Webhook deletion failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      { error: "Webhook deletion failed." },
      { status: 403 },
    );
  }
}

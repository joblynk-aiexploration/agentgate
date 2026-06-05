import { NextResponse } from "next/server";
import {
  ToolConnectionStatus,
  ToolType,
} from "@/generated/prisma/client";
import { createAuditLog } from "@/server/audit/audit-service";
import {
  createWebhookDemoDeliveryResult,
  webhookDemoConfigSchema,
  webhookDemoManagerRoles,
} from "@/server/integrations/webhook-demo";
import { getCurrentMembership } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const membership = await getCurrentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasRole(membership.role, webhookDemoManagerRoles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = webhookDemoConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.toolConnection.findFirst({
    where: {
      organizationId: membership.organizationId,
      toolType: ToolType.WEBHOOK,
    },
    select: {
      id: true,
    },
  });

  const connection = existing
    ? await prisma.toolConnection.update({
        where: {
          id: existing.id,
        },
        data: {
          configJson: parsed.data,
          name: "Webhook Demo",
          status: ToolConnectionStatus.DEMO,
        },
        select: {
          id: true,
          configJson: true,
          name: true,
          status: true,
          toolType: true,
        },
      })
    : await prisma.toolConnection.create({
        data: {
          organizationId: membership.organizationId,
          configJson: parsed.data,
          name: "Webhook Demo",
          status: ToolConnectionStatus.DEMO,
          toolType: ToolType.WEBHOOK,
        },
        select: {
          id: true,
          configJson: true,
          name: true,
          status: true,
          toolType: true,
        },
      });

  const execution = createWebhookDemoDeliveryResult({
    action: "webhook.trigger",
    actionRequestId: `demo_${connection.id}`,
    agentId: "integration-test",
    environment: "demo",
    metadata: {
      source: "integration_test",
    },
    organizationId: membership.organizationId,
    payload: {
      event: "webhook.demo.test",
      target: "integration-card",
    },
    reason: "Webhook Demo integration test",
    tool: ToolType.WEBHOOK,
    toolConnectionConfig: connection.configJson,
  });

  await createAuditLog({
    organizationId: membership.organizationId,
    actorType: "user",
    actorId: membership.userId,
    eventType: "integration.webhook_demo_tested",
    targetType: "ToolConnection",
    targetId: connection.id,
    metadataJson: {
      configName: parsed.data.name,
      execution: JSON.parse(JSON.stringify(execution)),
      simulated: true,
    },
  });

  return NextResponse.json({
    connection,
    result: execution,
  });
}

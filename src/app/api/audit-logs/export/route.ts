import { NextResponse } from "next/server";
import {
  auditLogToCsv,
  buildAuditLogWhere,
  canExportAuditLogs,
  getApiAuditLogMembership,
} from "@/server/audit/audit-service";
import { csvResponse } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { auditLogQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const membership = await getApiAuditLogMembership();

  if (!membership || !canExportAuditLogs(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = auditLogQuerySchema.safeParse({
    eventType: searchParams.get("eventType") || undefined,
    actorType: searchParams.get("actorType") || undefined,
    targetType: searchParams.get("targetType") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    search: searchParams.get("search") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const logs = await prisma.auditLog.findMany({
    where: buildAuditLogWhere(membership.organizationId, parsed.data),
    orderBy: {
      createdAt: "desc",
    },
    take: 5_000,
    select: {
      actorId: true,
      actorType: true,
      createdAt: true,
      eventType: true,
      metadataJson: true,
      targetId: true,
      targetType: true,
    },
  });

  const csv = auditLogToCsv(logs);

  return csvResponse(
    csv,
    `agentgate-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

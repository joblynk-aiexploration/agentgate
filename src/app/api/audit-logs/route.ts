import { NextResponse } from "next/server";
import {
  buildAuditLogWhere,
  getApiAuditLogMembership,
  redactSensitiveMetadata,
  summarizeAuditMetadata,
} from "@/server/audit/audit-service";
import { prisma } from "@/lib/prisma";
import { auditLogQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const membership = await getApiAuditLogMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    take: 250,
  });

  return NextResponse.json({
    auditLogs: logs.map((log) => ({
      ...log,
      metadataJson: redactSensitiveMetadata(log.metadataJson),
      metadataSummary: summarizeAuditMetadata(log.metadataJson),
    })),
  });
}

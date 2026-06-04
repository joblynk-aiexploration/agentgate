import { notFound, redirect } from "next/navigation";
import type { MembershipRole, Prisma } from "@/generated/prisma/client";
import { getCurrentMembership } from "@/lib/auth";
import { hasRole, roleRules } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  organizationId?: string | null;
  actorType: string;
  actorId?: string | null;
  eventType: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  metadataJson?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditLogFilters = {
  eventType?: string;
  actorType?: string;
  targetType?: string;
  from?: string;
  to?: string;
  search?: string;
};

export type AuditLogMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;

const sensitiveKeyPattern =
  /authorization|bearer|cookie|credential|encryption|fullkey|hash|password|pepper|secret|session|token/i;

export function canViewAuditLogs(role: MembershipRole) {
  return hasRole(role, roleRules.viewAuditLogs);
}

export function canExportAuditLogs(role: MembershipRole) {
  return hasRole(role, roleRules.viewAuditLogs);
}

export async function requireAuditLogViewer() {
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect("/login");
  }

  if (!canViewAuditLogs(membership.role)) {
    notFound();
  }

  return membership;
}

export async function getApiAuditLogMembership() {
  const membership = await getCurrentMembership();

  if (!membership || !canViewAuditLogs(membership.role)) {
    return null;
  }

  return membership;
}

export async function createAuditLog(input: AuditInput) {
  const metadata = input.metadata ?? input.metadataJson;

  return prisma.auditLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      eventType: input.eventType,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadataJson:
        metadata == null
          ? undefined
          : (redactSensitiveMetadata(metadata) as Prisma.InputJsonValue),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

function parseDateStart(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDateEnd(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  date.setDate(date.getDate() + 1);

  return date;
}

export function buildAuditLogWhere(
  organizationId: string,
  filters: AuditLogFilters,
): Prisma.AuditLogWhereInput {
  const search = filters.search?.trim();

  return {
    organizationId,
    eventType: filters.eventType?.trim() || undefined,
    actorType: filters.actorType?.trim() || undefined,
    targetType: filters.targetType?.trim() || undefined,
    createdAt: {
      gte: parseDateStart(filters.from),
      lt: parseDateEnd(filters.to),
    },
    OR: search
      ? [
          { eventType: { contains: search, mode: "insensitive" } },
          { actorType: { contains: search, mode: "insensitive" } },
          { actorId: { contains: search, mode: "insensitive" } },
          { targetType: { contains: search, mode: "insensitive" } },
          { targetId: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };
}

export function redactSensitiveMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveMetadata);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : redactSensitiveMetadata(entry),
    ]),
  );
}

export function summarizeAuditMetadata(value: unknown) {
  const redacted = redactSensitiveMetadata(value);

  if (redacted == null) {
    return "No metadata";
  }

  if (typeof redacted !== "object") {
    return String(redacted);
  }

  if (Array.isArray(redacted)) {
    return `${redacted.length} item${redacted.length === 1 ? "" : "s"}`;
  }

  const entries = Object.entries(redacted).slice(0, 4);

  if (entries.length === 0) {
    return "Empty object";
  }

  return entries
    .map(([key, entry]) => {
      if (entry == null) {
        return `${key}: null`;
      }

      if (typeof entry === "object") {
        return `${key}: ${Array.isArray(entry) ? "array" : "object"}`;
      }

      return `${key}: ${String(entry)}`;
    })
    .join(", ");
}

export function auditLogToCsv(logs: {
  actorId: string | null;
  actorType: string;
  createdAt: Date;
  eventType: string;
  metadataJson: Prisma.JsonValue | null;
  targetId: string | null;
  targetType: string | null;
}[]) {
  const header = [
    "timestamp",
    "eventType",
    "actorType",
    "actorId",
    "targetType",
    "targetId",
    "metadataJson",
  ];

  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    log.eventType,
    log.actorType,
    log.actorId ?? "",
    log.targetType ?? "",
    log.targetId ?? "",
    JSON.stringify(redactSensitiveMetadata(log.metadataJson ?? null)),
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function escapeCsv(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

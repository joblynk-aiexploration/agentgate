import { revalidatePath } from "next/cache";
import type { MembershipRole, Prisma } from "@/generated/prisma/client";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type NotificationMembership = NonNullable<
  Awaited<ReturnType<typeof getCurrentMembership>>
>;

type NotificationInput = {
  organizationId: string;
  userId?: string | null;
  role?: MembershipRole | null;
  type: string;
  title: string;
  body: string;
  metadataJson?: Prisma.InputJsonValue | null;
};

const sensitiveKeyPattern =
  /authorization|bearer|cookie|credential|encryption|fullkey|hash|password|pepper|secret|session|token/i;

function visibleNotificationWhere(
  membership: NotificationMembership,
): Prisma.NotificationWhereInput {
  return {
    organizationId: membership.organizationId,
    OR: [
      {
        userId: membership.userId,
      },
      {
        role: membership.role,
        userId: null,
      },
      {
        role: null,
        userId: null,
      },
    ],
  };
}

function redactNotificationMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactNotificationMetadata);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key)
        ? "[redacted]"
        : redactNotificationMetadata(entry),
    ]),
  );
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      role: input.role ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      metadataJson:
        input.metadataJson == null
          ? undefined
          : toInputJson(redactNotificationMetadata(input.metadataJson)),
    },
  });
}

export async function createRoleNotifications(
  organizationId: string,
  roles: MembershipRole[],
  input: Omit<NotificationInput, "organizationId" | "role" | "userId">,
) {
  const uniqueRoles = Array.from(new Set(roles));

  if (uniqueRoles.length === 0) {
    return [];
  }

  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
      role: {
        in: uniqueRoles,
      },
    },
    select: {
      role: true,
      userId: true,
    },
  });

  return Promise.all(
    memberships.map((membership) =>
      createNotification({
        ...input,
        organizationId,
        role: membership.role,
        userId: membership.userId,
      }),
    ),
  );
}

export async function createUserNotification(
  organizationId: string,
  userId: string,
  input: Omit<NotificationInput, "organizationId" | "role" | "userId">,
) {
  return createNotification({
    ...input,
    organizationId,
    userId,
  });
}

export async function listNotifications(
  membership: NotificationMembership,
  take = 10,
) {
  return prisma.notification.findMany({
    where: visibleNotificationWhere(membership),
    orderBy: {
      createdAt: "desc",
    },
    take,
  });
}

export async function countUnreadNotifications(
  membership: NotificationMembership,
) {
  return prisma.notification.count({
    where: {
      ...visibleNotificationWhere(membership),
      readAt: null,
    },
  });
}

export async function getNotificationSnapshot(
  membership: NotificationMembership,
) {
  const [notifications, unreadCount] = await Promise.all([
    listNotifications(membership, 8),
    countUnreadNotifications(membership),
  ]);

  return {
    notifications,
    unreadCount,
  };
}

export async function markNotificationRead(
  membership: NotificationMembership,
  notificationId: string,
) {
  const notification = await prisma.notification.findFirst({
    where: {
      ...visibleNotificationWhere(membership),
      id: notificationId,
    },
    select: {
      id: true,
    },
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  const updated = await prisma.notification.update({
    where: {
      id: notification.id,
      organizationId: membership.organizationId,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/");

  return updated;
}

export async function markAllNotificationsRead(
  membership: NotificationMembership,
) {
  const result = await prisma.notification.updateMany({
    where: {
      ...visibleNotificationWhere(membership),
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/");

  return result;
}

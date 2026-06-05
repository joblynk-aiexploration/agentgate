import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notifications";
import { notificationIdSchema } from "@/lib/validators";

type NotificationReadRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  context: NotificationReadRouteContext,
) {
  const membership = await getCurrentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = notificationIdSchema.safeParse(id);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid notification." }, { status: 400 });
  }

  try {
    return NextResponse.json({
      notification: await markNotificationRead(membership, parsed.data),
    });
  } catch (error) {
    console.error("Notification read failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }
}

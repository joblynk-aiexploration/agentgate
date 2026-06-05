import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { countUnreadNotifications, listNotifications } from "@/lib/notifications";

export async function GET() {
  const membership = await getCurrentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(membership, 20),
    countUnreadNotifications(membership),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

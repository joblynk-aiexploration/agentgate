import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/notifications";

export async function POST() {
  const membership = await getCurrentMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    result: await markAllNotificationsRead(membership),
  });
}

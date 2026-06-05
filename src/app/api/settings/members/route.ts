import { NextResponse } from "next/server";
import { getApiMemberViewer, listMembers } from "@/lib/members";

export async function GET() {
  const membership = await getApiMemberViewer();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    members: await listMembers(membership),
  });
}

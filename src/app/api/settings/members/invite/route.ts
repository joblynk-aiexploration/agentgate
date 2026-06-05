import { NextResponse } from "next/server";
import { getApiMemberManager, inviteMember } from "@/lib/members";
import { memberInviteSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const membership = await getApiMemberManager();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = memberInviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await inviteMember(membership, parsed.data);

    return NextResponse.json({
      ...result,
      message: "Demo invite created. No email was sent in V1.",
    });
  } catch (error) {
    console.error("Member invite failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json({ error: "Member invite failed." }, { status: 400 });
  }
}

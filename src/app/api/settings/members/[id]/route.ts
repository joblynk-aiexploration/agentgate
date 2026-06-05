import { NextResponse } from "next/server";
import {
  getApiMemberManager,
  removeMember,
  updateMemberRole,
} from "@/lib/members";
import { memberRoleUpdateSchema } from "@/lib/validators";

type MemberRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: MemberRouteProps) {
  const membership = await getApiMemberManager();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = memberRoleUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      member: await updateMemberRole(membership, id, parsed.data),
    });
  } catch (error) {
    console.error("Member role update failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json({ error: "Member role update failed." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: MemberRouteProps) {
  const membership = await getApiMemberManager();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    return NextResponse.json({
      member: await removeMember(membership, id),
    });
  } catch (error) {
    console.error("Member removal failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json({ error: "Member removal failed." }, { status: 400 });
  }
}

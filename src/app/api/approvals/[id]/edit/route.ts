import { NextResponse } from "next/server";
import {
  editApprovalPayload,
  getApiApprovalMembership,
} from "@/lib/approvals";
import { approvalEditSchema } from "@/lib/validators";

type ApprovalActionContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: ApprovalActionContext) {
  const membership = await getApiApprovalMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = approvalEditSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    const approval = await editApprovalPayload(membership, id, parsed.data);

    return NextResponse.json({ approval });
  } catch (error) {
    console.error("Payload edit failed", error);

    return NextResponse.json(
      { error: "Payload edit failed." },
      { status: 403 },
    );
  }
}

import { NextResponse } from "next/server";
import { getApiApprovalMembership, rejectApproval } from "@/lib/approvals";
import { approvalReviewSchema } from "@/lib/validators";

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

  const body = await request.json().catch(() => ({}));
  const parsed = approvalReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    const approval = await rejectApproval(membership, id, parsed.data);

    return NextResponse.json({ approval });
  } catch (error) {
    console.error("Rejection failed", error);

    return NextResponse.json(
      { error: "Rejection failed." },
      { status: 403 },
    );
  }
}

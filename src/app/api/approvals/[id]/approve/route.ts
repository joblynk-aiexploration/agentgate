import { NextResponse } from "next/server";
import {
  ApprovalActionError,
  approveApproval,
  getApiApprovalMembership,
} from "@/lib/approvals";
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
    const result = await approveApproval(membership, id, parsed.data);

    return NextResponse.json({
      ok: true,
      approvalId: result.approval.id,
      status: result.approval.status,
      actionRequestId: result.actionRequestId,
      actionStatus: result.actionStatus,
    });
  } catch (error) {
    console.error("Approval failed", {
      approvalId: (await context.params).id,
      errorType: error instanceof Error ? error.name : typeof error,
      organizationId: membership.organizationId,
      userId: membership.userId,
    });

    if (error instanceof ApprovalActionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Approval failed." },
      { status: 500 },
    );
  }
}

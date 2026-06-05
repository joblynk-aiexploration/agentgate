import { NextResponse } from "next/server";
import {
  createApprovalComment,
  getApiApprovalMembership,
  listApprovalComments,
} from "@/lib/approvals";
import { approvalCommentSchema } from "@/lib/validators";

type ApprovalCommentsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: ApprovalCommentsRouteContext,
) {
  const membership = await getApiApprovalMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    return NextResponse.json({
      comments: await listApprovalComments(membership, id),
    });
  } catch (error) {
    console.error("Approval comments fetch failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function POST(
  request: Request,
  context: ApprovalCommentsRouteContext,
) {
  const membership = await getApiApprovalMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = approvalCommentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    return NextResponse.json({
      comment: await createApprovalComment(membership, id, parsed.data),
    });
  } catch (error) {
    console.error("Approval comment create failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      { error: "Comment could not be added." },
      { status: 403 },
    );
  }
}

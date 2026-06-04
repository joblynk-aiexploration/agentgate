import { NextResponse } from "next/server";
import { getApiApprovalMembership } from "@/lib/approvals";
import { prisma } from "@/lib/prisma";

type ApprovalRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: ApprovalRouteContext) {
  const membership = await getApiApprovalMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const approval = await prisma.approvalRequest.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
    },
    include: {
      assignedTo: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
      reviewedBy: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
      actionRequest: {
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          policyMatched: {
            select: {
              id: true,
              name: true,
            },
          },
          riskAssessments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!approval) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ approval });
}

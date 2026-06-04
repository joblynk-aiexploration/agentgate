import { NextResponse } from "next/server";
import {
  buildApprovalWhere,
  getApiApprovalMembership,
} from "@/lib/approvals";
import { prisma } from "@/lib/prisma";
import { approvalListQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const membership = await getApiApprovalMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = approvalListQuerySchema.safeParse({
    status: searchParams.get("status") || undefined,
    riskLevel: searchParams.get("riskLevel") || undefined,
    tool: searchParams.get("tool") || undefined,
    agentId: searchParams.get("agentId") || undefined,
    date: searchParams.get("date") || undefined,
    assignedToMe: searchParams.get("assignedToMe") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const approvals = await prisma.approvalRequest.findMany({
    where: buildApprovalWhere(
      membership.organizationId,
      membership.userId,
      parsed.data,
    ),
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      assignedTo: {
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
        },
      },
    },
  });

  return NextResponse.json({ approvals });
}

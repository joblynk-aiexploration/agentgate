import { NextResponse } from "next/server";
import {
  createPolicy,
  getApiPolicyManagerMembership,
  getApiPolicyMembership,
} from "@/lib/policies";
import { prisma } from "@/lib/prisma";
import { policyInputSchema } from "@/lib/validators";

export async function GET() {
  const membership = await getApiPolicyMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const policies = await prisma.policy.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      priority: true,
      updatedAt: true,
      rules: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          tool: true,
          action: true,
          decision: true,
          requiredRole: true,
          riskOverride: true,
          conditionsJson: true,
        },
      },
    },
  });

  return NextResponse.json({ policies });
}

export async function POST(request: Request) {
  const membership = await getApiPolicyManagerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = policyInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const policy = await createPolicy(membership, parsed.data);

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Policy creation failed.",
      },
      { status: 400 },
    );
  }
}

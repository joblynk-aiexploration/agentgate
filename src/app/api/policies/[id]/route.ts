import { NextResponse } from "next/server";
import {
  deletePolicy,
  getApiPolicyManagerMembership,
  getApiPolicyMembership,
  updatePolicy,
} from "@/lib/policies";
import { prisma } from "@/lib/prisma";
import { policyPatchSchema } from "@/lib/validators";

type PolicyRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: PolicyRouteContext) {
  const membership = await getApiPolicyMembership();

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const policy = await prisma.policy.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
    },
    include: {
      createdBy: {
        select: {
          email: true,
          name: true,
        },
      },
      rules: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!policy) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ policy });
}

export async function PATCH(request: Request, context: PolicyRouteContext) {
  const membership = await getApiPolicyManagerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = policyPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.policy.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const policy = await updatePolicy(membership, id, parsed.data);

    return NextResponse.json({ policy });
  } catch (error) {
    console.error("Policy update failed", error);

    return NextResponse.json(
      { error: "Policy update failed." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: PolicyRouteContext) {
  const membership = await getApiPolicyManagerMembership();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.policy.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deletePolicy(membership, id);

  return NextResponse.json({ ok: true });
}

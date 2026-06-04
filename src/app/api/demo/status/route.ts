import { NextResponse } from "next/server";
import {
  ApiKeyStatus,
  ApprovalStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const organization = await prisma.organization.findUnique({
      where: {
        slug: "acme",
      },
      select: {
        id: true,
        name: true,
      },
    });

    const organizationId = organization?.id;

    const [
      ownerUser,
      reviewerUser,
      supportRefundAgent,
      refundPolicy,
      demoApiKey,
      pendingApprovalCount,
      auditLogCount,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { email: "owner@agentgate.dev" },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { email: "reviewer@agentgate.dev" },
        select: { id: true },
      }),
      organizationId
        ? prisma.agent.findFirst({
            where: {
              organizationId,
              slug: "support-refund-agent",
            },
            select: { id: true },
          })
        : null,
      organizationId
        ? prisma.policy.findFirst({
            where: {
              organizationId,
              name: {
                contains: "Refunds above $500",
                mode: "insensitive",
              },
            },
            select: { id: true },
          })
        : null,
      organizationId
        ? prisma.apiKey.findFirst({
            where: {
              organizationId,
              keyPrefix: "ag_test_seed",
              status: ApiKeyStatus.ACTIVE,
            },
            select: { id: true },
          })
        : null,
      organizationId
        ? prisma.approvalRequest.count({
            where: {
              organizationId,
              status: ApprovalStatus.PENDING,
            },
          })
        : 0,
      organizationId
        ? prisma.auditLog.count({
            where: {
              organizationId,
            },
          })
        : 0,
    ]);

    const checks = {
      acmeOrganization: organization?.name === "Acme AI Operations",
      ownerUser: Boolean(ownerUser),
      reviewerUser: Boolean(reviewerUser),
      supportRefundAgent: Boolean(supportRefundAgent),
      refundsAbove500Policy: Boolean(refundPolicy),
      demoApiKeyRecord: Boolean(demoApiKey),
      pendingApproval: pendingApprovalCount > 0,
      auditLog: auditLogCount > 0,
    };

    return NextResponse.json({
      ok: Object.values(checks).every(Boolean),
      checks,
      counts: {
        pendingApprovals: pendingApprovalCount,
        auditLogs: auditLogCount,
      },
    });
  } catch (error) {
    console.error("Demo status check failed", error);

    return NextResponse.json(
      {
        ok: false,
        checks: {
          acmeOrganization: false,
          ownerUser: false,
          reviewerUser: false,
          supportRefundAgent: false,
          refundsAbove500Policy: false,
          demoApiKeyRecord: false,
          pendingApproval: false,
          auditLog: false,
        },
        counts: {
          pendingApprovals: 0,
          auditLogs: 0,
        },
      },
      { status: 503 },
    );
  }
}

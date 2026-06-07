import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  ActionDecision,
  ActionStatus,
  ApprovalStatus,
  PrismaClient,
} from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  console.log("Local demo helper: approve latest Support Operations Agent large-refund approval.");
  console.log("This is not production approval logic.\n");

  const organization = await prisma.organization.findUnique({
    where: { slug: "acme" },
    select: { id: true },
  });
  const reviewer = await prisma.user.findUnique({
    where: { email: "reviewer@agentgate.dev" },
    select: { id: true },
  });

  if (!organization || !reviewer) {
    throw new Error("Demo organization or reviewer was not found.");
  }

  const approval = await prisma.approvalRequest.findFirst({
    where: {
      organizationId: organization.id,
      status: ApprovalStatus.PENDING,
      actionRequest: {
        decision: ActionDecision.REQUIRE_APPROVAL,
        metadataJson: {
          path: ["scenario"],
          equals: "large-refund",
        },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      actionRequest: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!approval) {
    throw new Error("No pending large-refund approval was found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.approvalRequest.update({
      where: {
        id: approval.id,
        organizationId: organization.id,
      },
      data: {
        status: ApprovalStatus.APPROVED,
        reviewedById: reviewer.id,
        reviewComment: "Approved by local demo helper for integration testing.",
      },
    });

    await tx.actionRequest.update({
      where: {
        id: approval.actionRequest.id,
        organizationId: organization.id,
      },
      data: {
        status: ActionStatus.APPROVED,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        actorType: "user",
        actorId: reviewer.id,
        eventType: "approval.approved",
        targetType: "ApprovalRequest",
        targetId: approval.id,
        metadataJson: {
          actionRequestId: approval.actionRequest.id,
          localDemoHelper: true,
        },
      },
    });
  });

  console.log(`Approved approvalRequestId=${approval.id}`);
  console.log(`actionRequestId=${approval.actionRequest.id}`);
}

main()
  .catch((error) => {
    console.error("Local demo approval helper failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { AgentStatus, PrismaClient } from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  console.log("Local demo helper: resume Support Refund Agent.");

  const organization = await prisma.organization.findUnique({
    where: { slug: "acme" },
    select: { id: true },
  });

  if (!organization) {
    throw new Error("Demo organization was not found.");
  }

  const agent = await prisma.agent.update({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "support-refund-agent",
      },
    },
    data: {
      status: AgentStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      actorType: "system",
      actorId: null,
      eventType: "agent.resumed",
      targetType: "Agent",
      targetId: agent.id,
      metadataJson: {
        localDemoHelper: true,
        status: agent.status,
      },
    },
  });

  console.log(`${agent.name} status=${agent.status}`);
}

main()
  .catch((error) => {
    console.error("Resume helper failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

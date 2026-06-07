import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  console.log("Local demo helper: enable Acme organization kill switch.");

  const organization = await prisma.organization.update({
    where: { slug: "acme" },
    data: {
      killSwitchEnabled: true,
    },
    select: {
      id: true,
      name: true,
      killSwitchEnabled: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      actorType: "system",
      actorId: null,
      eventType: "organization.kill_switch_enabled",
      targetType: "Organization",
      targetId: organization.id,
      metadataJson: {
        localDemoHelper: true,
        killSwitchEnabled: organization.killSwitchEnabled,
      },
    },
  });

  console.log(`${organization.name} killSwitch=${organization.killSwitchEnabled}`);
}

main()
  .catch((error) => {
    console.error("Enable kill switch helper failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

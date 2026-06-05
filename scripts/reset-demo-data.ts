import "dotenv/config";
import {
  disconnectSeedPrisma,
  seedAgentGateDemoData,
} from "../prisma/seed";

async function main() {
  console.log("AgentGate demo reset");
  console.log("Scope: Acme AI Operations demo tenant only.");
  console.log("Unrelated organizations are not deleted.\n");

  await seedAgentGateDemoData();

  console.log("\nDemo reset complete.");
  console.log("Run npm run demo:check to verify the clean V1 demo state.");
}

main()
  .catch((error) => {
    console.error("Demo reset failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeedPrisma();
  });

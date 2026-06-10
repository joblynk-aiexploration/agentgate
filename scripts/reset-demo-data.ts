import "dotenv/config";
import {
  disconnectSeedPrisma,
  seedAgentGateDemoData,
} from "../prisma/seed";

function isDatabaseConnectionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ECONNREFUSED"
  );
}

function printDatabaseSetupHelp() {
  console.error("PostgreSQL is not reachable for demo reset.");
  console.error("Start the local database and rerun:");
  console.error("  docker compose up -d postgres");
  console.error("  npx prisma migrate dev");
  console.error("  npm run demo:reset");
}

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
    if (isDatabaseConnectionError(error)) {
      printDatabaseSetupHelp();
    } else {
      console.error(error);
    }
    process.exit(1);
  })
  .finally(async () => {
    await disconnectSeedPrisma();
  });

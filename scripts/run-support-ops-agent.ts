import { runSupportOperationsAgent } from "../examples/agents/support-ops-agent/run-agent";

runSupportOperationsAgent().catch((error) => {
  console.error("\nSupport Operations Agent failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

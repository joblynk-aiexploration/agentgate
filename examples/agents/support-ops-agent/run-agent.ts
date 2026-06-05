import "dotenv/config";
import { AgentBrain } from "./agent-brain";
import {
  AgentGateClient,
  MockAgentGateClient,
} from "./agentgate-client";
import { getScenario, getScenarioNames } from "./scenarios";
import { TaskMemory } from "./task-memory";
import type {
  AgentRunOptions,
  GatewayActionStatusResponse,
  ScenarioName,
} from "./types";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_AGENT_ID = "support-refund-agent";

type GatewayClientLike = {
  check: InstanceType<typeof AgentGateClient>["check"];
  execute: InstanceType<typeof AgentGateClient>["execute"];
  getActionStatus: InstanceType<typeof AgentGateClient>["getActionStatus"];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`${name} is required for live mode.`);
  }

  return value;
}

function parseArgs(argv: string[]): AgentRunOptions {
  const options: AgentRunOptions = {
    all: false,
    dryRun: false,
    timeoutSeconds: 120,
    waitForApproval: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--all":
        options.all = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--wait-for-approval":
        options.waitForApproval = true;
        break;
      case "--resume":
        options.resumeActionRequestId = argv[index + 1];
        index += 1;
        break;
      case "--scenario":
        options.scenario = argv[index + 1] as ScenarioName | undefined;
        index += 1;
        break;
      case "--timeout-seconds":
        options.timeoutSeconds = Number(argv[index + 1] ?? options.timeoutSeconds);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.all && !options.scenario && !options.resumeActionRequestId) {
    options.scenario = "large-refund";
  }

  if (
    options.scenario &&
    !getScenarioNames().includes(options.scenario)
  ) {
    throw new Error(`Unknown scenario: ${options.scenario}`);
  }

  if (!Number.isFinite(options.timeoutSeconds) || options.timeoutSeconds <= 0) {
    throw new Error("--timeout-seconds must be a positive number.");
  }

  return options;
}

async function pollForApproval(input: {
  actionRequestId: string;
  client: GatewayClientLike;
  timeoutSeconds: number;
}) {
  const deadline = Date.now() + input.timeoutSeconds * 1000;
  let latest: GatewayActionStatusResponse | null = null;

  while (Date.now() < deadline) {
    latest = await input.client.getActionStatus(input.actionRequestId);
    console.log(
      `Approval poll: action=${latest.actionRequestId} status=${latest.status} approval=${latest.approvalRequest?.status ?? "none"}`,
    );

    if (latest.status === "APPROVED" || latest.status === "ALLOWED") {
      return latest;
    }

    if (
      latest.status === "REJECTED" ||
      latest.status === "BLOCKED" ||
      latest.status === "CANCELLED" ||
      latest.status === "EXPIRED"
    ) {
      return latest;
    }

    await sleep(5000);
  }

  throw new Error(
    `Timed out after ${input.timeoutSeconds} seconds waiting for approval.`,
  );
}

async function resumeAction(input: {
  actionRequestId: string;
  client: GatewayClientLike;
  timeoutSeconds: number;
  waitForApproval: boolean;
}) {
  console.log(`Resuming action request: ${input.actionRequestId}`);

  const status = input.waitForApproval
    ? await pollForApproval(input)
    : await input.client.getActionStatus(input.actionRequestId);

  console.log("Current AgentGate status:");
  console.log(JSON.stringify(status, null, 2));

  if (status.status === "APPROVED" || status.status === "ALLOWED") {
    const execution = await input.client.execute(input.actionRequestId);
    console.log("Simulated execution result:");
    console.log(JSON.stringify(execution, null, 2));
    return;
  }

  if (status.status === "PENDING_APPROVAL") {
    console.log(
      "Still waiting for approval. Approve it in AgentGate, then rerun with --resume or use --wait-for-approval.",
    );
    return;
  }

  console.log(`Action is not executable in current status: ${status.status}`);
}

async function runScenario(input: {
  client: GatewayClientLike;
  dryRun: boolean;
  scenarioName: ScenarioName;
  timeoutSeconds: number;
  waitForApproval: boolean;
}) {
  const scenario = getScenario(input.scenarioName);
  const memory = new TaskMemory({
    mode: input.dryRun ? "dry-run" : "live",
    scenario: scenario.name,
    ticket: scenario,
  });
  const brain = new AgentBrain(requireEnv("AGENTGATE_AGENT_ID", DEFAULT_AGENT_ID));
  const intent = brain.decide(scenario);

  console.log("\n=== Support Operations Agent ===");
  console.log(`Mode: ${input.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Scenario: ${scenario.name} - ${scenario.title}`);
  console.log(`Ticket ${scenario.ticketId}: ${scenario.ticket}`);
  console.log("\nIntended action:");
  console.log(JSON.stringify(intent, null, 2));

  memory.recordIntent(intent);

  if (input.dryRun) {
    memory.note("Dry-run mode used a mock AgentGate client.");
  }

  const decision = await input.client.check(intent);

  memory.recordDecision(decision);
  console.log("\nAgentGate decision:");
  console.log(JSON.stringify(decision, null, 2));

  if (decision.decision === "ALLOW" || decision.decision === "LOG_ONLY") {
    const execution = await input.client.execute(decision.actionRequestId);
    memory.recordExecution(execution);
    console.log("\nSimulated execution result:");
    console.log(JSON.stringify(execution, null, 2));
  } else if (decision.decision === "REQUIRE_APPROVAL") {
    console.log("\nApproval required.");
    console.log(`Approval request ID: ${decision.approvalRequestId ?? "unknown"}`);

    if (input.waitForApproval) {
      const status = await pollForApproval({
        actionRequestId: decision.actionRequestId,
        client: input.client,
        timeoutSeconds: input.timeoutSeconds,
      });

      if (status.status === "APPROVED") {
        const execution = await input.client.execute(decision.actionRequestId);
        memory.recordExecution(execution);
        console.log("\nSimulated execution result:");
        console.log(JSON.stringify(execution, null, 2));
      } else {
        console.log(`Approval wait ended with status: ${status.status}`);
      }
    } else {
      console.log(
        `Approve it in AgentGate, then rerun with --resume ${decision.actionRequestId} or add --wait-for-approval.`,
      );
    }
  } else if (decision.decision === "BLOCK") {
    console.log("\nBlocked by AgentGate. The agent will not execute anything.");
    console.log(`Reason: ${decision.reason}`);
  } else if (decision.decision === "SANDBOX_ONLY") {
    console.log(
      "\nSandbox-only decision received. This support agent will not execute production actions for sandbox-only decisions.",
    );
  }

  const transcriptPath = await memory.write();
  console.log(`\nTranscript written: ${transcriptPath}`);
}

export async function runSupportOperationsAgent(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const client: GatewayClientLike = options.dryRun
    ? new MockAgentGateClient()
    : new AgentGateClient({
        apiKey: requireEnv("AGENTGATE_DEMO_API_KEY"),
        baseUrl: requireEnv("AGENTGATE_BASE_URL", DEFAULT_BASE_URL),
      });

  if (options.dryRun) {
    console.log("DRY RUN: using mock AgentGate responses. No server is required.");
  }

  if (options.resumeActionRequestId) {
    await resumeAction({
      actionRequestId: options.resumeActionRequestId,
      client,
      timeoutSeconds: options.timeoutSeconds,
      waitForApproval: options.waitForApproval,
    });
    return;
  }

  const scenarios = options.all ? getScenarioNames() : [options.scenario!];

  for (const scenarioName of scenarios) {
    await runScenario({
      client,
      dryRun: options.dryRun,
      scenarioName,
      timeoutSeconds: options.timeoutSeconds,
      waitForApproval: options.waitForApproval,
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSupportOperationsAgent().catch((error) => {
    console.error("\nSupport Operations Agent failed.");
    console.error(error instanceof Error ? error.message : error);
    console.error(
      "For live mode, make sure AgentGate is running and AGENTGATE_BASE_URL plus AGENTGATE_DEMO_API_KEY are set.",
    );
    process.exit(1);
  });
}

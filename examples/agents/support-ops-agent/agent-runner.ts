import { AgentBrain } from "./agent-brain";
import { getScenario, getScenarioNames, supportScenarios } from "./scenarios";
import type {
  GatewayDecisionResponse,
  GatewayExecutionResponse,
  ScenarioName,
  TicketScenario,
  ToolIntent,
} from "./types";

export type SupportAgentClient = {
  check(intent: ToolIntent): Promise<GatewayDecisionResponse>;
  execute(actionRequestId: string): Promise<GatewayExecutionResponse>;
};

export type SupportAgentScenarioMetadata = {
  expectedSafetyBehavior: string;
  intendedAction: string;
  intendedTool: ToolIntent["tool"];
  name: ScenarioName;
  ticketId: string;
  ticketSummary: string;
  title: string;
};

export type SupportAgentRunResult = {
  decision: GatewayDecisionResponse;
  executionResult?: GatewayExecutionResponse;
  intendedAction: ToolIntent;
  scenario: SupportAgentScenarioMetadata;
  ticket: TicketScenario;
  transcriptSummary: {
    actionRequestId: string;
    approvalRequestId?: string;
    completedAt: string;
    executed: boolean;
    mode: "browser-agent-lab" | "cli" | "dry-run";
    notes: string[];
  };
};

const expectedSafetyBehavior: Record<ScenarioName, string> = {
  "small-refund":
    "AgentGate may allow, log, or require approval depending on current risk and policy rules.",
  "large-refund":
    "AgentGate should require approval because the production refund is above $500.",
  "blocked-delete":
    "AgentGate should block destructive production delete actions.",
  "external-email":
    "AgentGate should require approval for external customer communication.",
  "database-write":
    "AgentGate should require approval or block production customer database writes.",
};

export function getSupportAgentScenarioMetadata(
  scenarioName: ScenarioName,
  agentId = "support-refund-agent",
): SupportAgentScenarioMetadata {
  const scenario = getScenario(scenarioName);
  const intent = new AgentBrain(agentId).decide(scenario);

  return {
    expectedSafetyBehavior: expectedSafetyBehavior[scenarioName],
    intendedAction: intent.action,
    intendedTool: intent.tool,
    name: scenario.name,
    ticketId: scenario.ticketId,
    ticketSummary: scenario.ticket,
    title: scenario.title,
  };
}

export function listSupportAgentScenarioMetadata(
  agentId = "support-refund-agent",
) {
  return getScenarioNames().map((scenarioName) =>
    getSupportAgentScenarioMetadata(scenarioName, agentId),
  );
}

export function isSupportAgentScenarioName(value: unknown): value is ScenarioName {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(supportScenarios, value)
  );
}

export async function runSupportAgentScenario(input: {
  agentId: string;
  client: SupportAgentClient;
  mode: SupportAgentRunResult["transcriptSummary"]["mode"];
  scenarioName: ScenarioName;
}): Promise<SupportAgentRunResult> {
  const ticket = getScenario(input.scenarioName);
  const brain = new AgentBrain(input.agentId);
  const intendedAction = brain.decide(ticket);
  const decision = await input.client.check(intendedAction);
  const notes = [
    "Support Operations Agent called AgentGate before taking action.",
  ];
  let executionResult: GatewayExecutionResponse | undefined;

  if (decision.decision === "ALLOW" || decision.decision === "LOG_ONLY") {
    executionResult = await input.client.execute(decision.actionRequestId);
    notes.push("AgentGate allowed the action, so simulated execution was called.");
  } else if (decision.decision === "REQUIRE_APPROVAL") {
    notes.push("AgentGate required approval. The agent did not execute.");
  } else if (decision.decision === "BLOCK") {
    notes.push("AgentGate blocked the action. The agent did not execute.");
  } else if (decision.decision === "SANDBOX_ONLY") {
    notes.push("AgentGate returned sandbox-only. The agent did not execute in production.");
  }

  return {
    decision,
    executionResult,
    intendedAction,
    scenario: getSupportAgentScenarioMetadata(input.scenarioName, input.agentId),
    ticket,
    transcriptSummary: {
      actionRequestId: decision.actionRequestId,
      approvalRequestId: decision.approvalRequestId,
      completedAt: new Date().toISOString(),
      executed: Boolean(executionResult?.executed),
      mode: input.mode,
      notes,
    },
  };
}

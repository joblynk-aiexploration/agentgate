import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AgentTranscript,
  GatewayDecisionResponse,
  GatewayExecutionResponse,
  ScenarioName,
  TicketScenario,
  ToolIntent,
} from "./types";

const runLogsDir = path.join(
  process.cwd(),
  "examples",
  "agents",
  "support-ops-agent",
  "run-logs",
);

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
}

export class TaskMemory {
  private readonly transcript: AgentTranscript;

  constructor(input: {
    mode: "dry-run" | "live";
    scenario: ScenarioName;
    ticket: TicketScenario;
  }) {
    this.transcript = {
      mode: input.mode,
      scenario: input.scenario,
      ticketId: input.ticket.ticketId,
      ticket: input.ticket.ticket,
      notes: [],
      startedAt: new Date().toISOString(),
    };
  }

  note(message: string) {
    this.transcript.notes.push(message);
  }

  recordIntent(intent: ToolIntent) {
    this.transcript.decidedAction = intent;
  }

  recordDecision(decision: GatewayDecisionResponse) {
    this.transcript.gatewayDecision = decision;
    this.transcript.actionRequestId = decision.actionRequestId;
    this.transcript.approvalRequestId = decision.approvalRequestId;
    this.transcript.finalStatus = decision.status;

    if (decision.decision === "BLOCK") {
      this.transcript.blockedReason = decision.reason;
    }
  }

  recordExecution(execution: GatewayExecutionResponse) {
    this.transcript.executionResult = execution;
    this.transcript.finalStatus = execution.status;
  }

  async write() {
    this.transcript.completedAt = new Date().toISOString();
    await mkdir(runLogsDir, { recursive: true });

    const fileName = [
      new Date().toISOString().replace(/[:.]/g, "-"),
      safeFilePart(this.transcript.scenario),
      safeFilePart(this.transcript.ticketId),
      "transcript.json",
    ].join("-");
    const filePath = path.join(runLogsDir, fileName);

    await writeFile(filePath, JSON.stringify(this.transcript, null, 2));

    return filePath;
  }
}

export type ScenarioName =
  | "small-refund"
  | "large-refund"
  | "blocked-delete"
  | "external-email"
  | "database-write";

export type AgentDecision =
  | "ALLOW"
  | "REQUIRE_APPROVAL"
  | "BLOCK"
  | "LOG_ONLY"
  | "SANDBOX_ONLY";

export type ActionStatus =
  | "REQUESTED"
  | "ALLOWED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "BLOCKED"
  | "EXECUTED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export type RiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TicketScenario = {
  name: ScenarioName;
  title: string;
  ticketId: string;
  ticket: string;
  customerTier?: string;
};

export type ToolIntent = {
  agentId: string;
  tool: "stripe" | "email_preview" | "postgres";
  action: string;
  environment: "production";
  amount?: number;
  currency?: "USD";
  reason: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  dataSensitivity?: string;
  reversible?: boolean;
  externalCommunication?: boolean;
};

export type GatewayRisk = {
  score: number;
  level: RiskLevel;
  signals: string[];
  explanation: string;
};

export type GatewayDecisionResponse = {
  actionRequestId: string;
  decision: AgentDecision;
  allowed: boolean;
  requiresApproval: boolean;
  approvalRequestId?: string;
  risk: GatewayRisk;
  reason: string;
  status: ActionStatus;
};

export type GatewayExecutionResponse = {
  actionRequestId: string;
  status: ActionStatus;
  executed: boolean;
  result: {
    executor: string;
    message: string;
    output: Record<string, unknown>;
    simulated: boolean;
    success: boolean;
  };
};

export type GatewayActionStatusResponse = {
  actionRequestId: string;
  decision: AgentDecision;
  status: ActionStatus;
  requiresApproval: boolean;
  approvalRequest?: {
    id: string;
    status: string;
    requiredRole?: string | null;
  } | null;
  risk: GatewayRisk;
  reason: string;
};

export type AgentTranscript = {
  mode: "dry-run" | "live";
  scenario: ScenarioName;
  ticketId: string;
  ticket: string;
  decidedAction?: ToolIntent;
  gatewayDecision?: GatewayDecisionResponse;
  actionRequestId?: string;
  approvalRequestId?: string;
  finalStatus?: ActionStatus;
  executionResult?: GatewayExecutionResponse;
  blockedReason?: string;
  notes: string[];
  startedAt: string;
  completedAt?: string;
};

export type AgentRunOptions = {
  all: boolean;
  dryRun: boolean;
  resumeActionRequestId?: string;
  scenario?: ScenarioName;
  timeoutSeconds: number;
  waitForApproval: boolean;
};

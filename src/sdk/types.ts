export type AgentGateDecision =
  | "ALLOW"
  | "REQUIRE_APPROVAL"
  | "BLOCK"
  | "LOG_ONLY"
  | "SANDBOX_ONLY";

export type AgentGateRiskLevel =
  | "NONE"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type AgentGateActionStatus =
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

export type AgentGateTool =
  | "slack"
  | "SLACK"
  | "stripe"
  | "STRIPE"
  | "gmail"
  | "GMAIL"
  | "email_preview"
  | "EMAIL_PREVIEW"
  | "hubspot"
  | "HUBSPOT"
  | "salesforce"
  | "SALESFORCE"
  | "github"
  | "GITHUB"
  | "postgres"
  | "POSTGRES"
  | "webhook"
  | "WEBHOOK"
  | "demo_commerce"
  | "DEMO_COMMERCE"
  | "custom"
  | "CUSTOM";

export type JsonObject = Record<string, unknown>;

export type AgentGateCheckInput = {
  action: string;
  agentId: string;
  amount?: number | null;
  currency?: string | null;
  dataSensitivity?: string | null;
  environment?: string;
  externalCommunication?: boolean | null;
  idempotencyKey?: string;
  metadata?: JsonObject;
  payload?: JsonObject;
  productionEnvironment?: boolean | null;
  reason?: string | null;
  reversible?: boolean | null;
  tool: AgentGateTool;
};

export type AgentGateRisk = {
  explanation: string;
  level: AgentGateRiskLevel;
  score: number;
  signals: string[];
};

export type AgentGateCheckResponse = {
  actionRequestId: string;
  allowed: boolean;
  approvalRequestId?: string;
  decision: AgentGateDecision;
  reason: string;
  requiresApproval: boolean;
  risk: AgentGateRisk;
  status: AgentGateActionStatus;
};

export type AgentGateExecutionResult = {
  executor: string;
  message: string;
  output: JsonObject;
  simulated: true;
  success: boolean;
};

export type AgentGateExecuteResponse = {
  actionRequestId: string;
  executed: boolean;
  result: AgentGateExecutionResult;
  status: AgentGateActionStatus;
};

export type AgentGateCancelResponse = {
  actionRequestId: string;
  cancelled: boolean;
  status: AgentGateActionStatus;
};

export type AgentGateClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

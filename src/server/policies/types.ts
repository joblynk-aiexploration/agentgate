import type {
  ActionDecision,
  AgentRiskTier,
  AgentStatus,
  MembershipRole,
  OrganizationStatus,
  PolicyStatus,
  RiskLevel,
  ToolConnectionStatus,
  ToolType,
} from "@/generated/prisma/client";
import type { RiskAssessmentResult } from "@/server/risk/types";

export type PolicyEngineOrganization = {
  id: string;
  name?: string;
  status: OrganizationStatus | string;
  killSwitchEnabled: boolean;
};

export type PolicyEngineAgent = {
  id: string;
  name?: string;
  department?: string | null;
  status: AgentStatus | string;
  riskTier?: AgentRiskTier | string;
};

export type PolicyEngineToolConnection = {
  id?: string;
  toolType: ToolType | string;
  status: ToolConnectionStatus | string;
};

export type MetadataFieldMatch = {
  field: string;
  value: unknown;
};

export type PolicyConditions = {
  agentId?: string;
  department?: string;
  tool?: ToolType | string | Array<ToolType | string>;
  action?: string;
  environment?: string;
  amountGreaterThan?: number;
  amountLessThan?: number;
  currency?: string;
  customerTier?: string;
  dataSensitivity?: string;
  reversible?: boolean;
  externalCommunication?: boolean;
  productionEnvironment?: boolean;
  actionContains?: string | string[];
  metadata?: Record<string, unknown>;
  metadataFieldMatch?: MetadataFieldMatch;
  all?: LegacyCondition[];
  any?: LegacyCondition[];
};

export type LegacyCondition = {
  field: string;
  operator:
    | "equals"
    | "notEquals"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "notContains"
    | "endsWith"
    | "notEndsWith"
    | "in";
  value: unknown;
};

export type PolicyRuleForEvaluation = {
  id: string;
  policyId: string;
  tool?: ToolType | string | null;
  action?: string | null;
  conditionsJson?: unknown;
  decision: ActionDecision;
  requiredRole?: MembershipRole | null;
  riskOverride?: RiskLevel | null;
};

export type PolicyForEvaluation = {
  id: string;
  name: string;
  description?: string | null;
  status: PolicyStatus | string;
  priority: number;
  rules: PolicyRuleForEvaluation[];
};

export type PolicyEvaluationInput = {
  organization: PolicyEngineOrganization;
  agent: PolicyEngineAgent;
  toolConnection?: PolicyEngineToolConnection | null;
  policies?: PolicyForEvaluation[];
  organizationId?: string;
  tool: ToolType | string;
  action: string;
  environment?: string | null;
  amount?: number | null;
  currency?: string | null;
  customerTier?: string | null;
  dataSensitivity?: string | null;
  reversible?: boolean | null;
  externalCommunication?: boolean | null;
  productionEnvironment?: boolean | null;
  payload?: unknown;
  metadata?: unknown;
  riskResult?: RiskAssessmentResult | null;
};

export type PolicyEvaluationResult = {
  decision: ActionDecision;
  allowed: boolean;
  requiresApproval: boolean;
  requiredRole?: MembershipRole;
  matchedPolicyId?: string;
  matchedPolicyRuleId?: string;
  reason: string;
  policyReasons: string[];
};

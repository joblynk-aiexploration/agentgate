import type {
  AgentRiskTier,
  OrganizationStatus,
  RiskLevel,
  ToolType,
} from "@/generated/prisma/client";

export type DataSensitivity = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "PRIVATE" | "SENSITIVE";

export type RiskAssessmentOrganization = {
  id?: string;
  name?: string;
  status?: OrganizationStatus | string;
  killSwitchEnabled?: boolean;
};

export type RiskAssessmentAgent = {
  id?: string;
  name?: string;
  riskTier?: AgentRiskTier | string;
};

export type RiskAssessmentInput = {
  organization?: RiskAssessmentOrganization;
  agent?: RiskAssessmentAgent;
  tool: ToolType | string;
  action: string;
  environment?: string;
  amount?: number | null;
  currency?: string | null;
  reason?: string | null;
  payload?: unknown;
  metadata?: unknown;
  dataSensitivity?: DataSensitivity | string | null;
  reversible?: boolean | null;
  externalCommunication?: boolean | null;
  productionEnvironment?: boolean | null;
};

export type RiskAssessmentResult = {
  score: number;
  level: RiskLevel;
  signals: string[];
  explanation: string;
  modelVersion: "rules-v1";
};

export interface RiskReviewer {
  assess(input: RiskAssessmentInput): Promise<RiskAssessmentResult>;
}

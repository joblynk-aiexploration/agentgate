import { AgentRiskTier, RiskLevel, ToolType } from "@/generated/prisma/client";
import type {
  RiskAssessmentInput,
  RiskAssessmentResult,
  RiskReviewer,
} from "@/server/risk/types";

type Signal = {
  key: string;
  label: string;
  points: number;
};

const legalTerms = [
  "legal",
  "compliance",
  "regulatory",
  "lawsuit",
  "contract",
  "gdpr",
  "hipaa",
  "soc2",
  "audit",
];

const commonActions = new Set([
  "message.send",
  "email.send",
  "refund.create",
  "payment.capture",
  "query.write",
  "query.read",
  "ticket.update",
  "note.create",
  "notification.send",
]);

const highRiskTools: ToolType[] = [
  ToolType.STRIPE,
  ToolType.POSTGRES,
  ToolType.GITHUB,
];

function stringifySearchable(input: RiskAssessmentInput) {
  return [
    input.action,
    input.reason,
    input.environment,
    input.tool,
    JSON.stringify(input.payload ?? {}),
    JSON.stringify(input.metadata ?? {}),
  ]
    .join(" ")
    .toLowerCase();
}

function isProduction(input: RiskAssessmentInput, searchable: string) {
  return (
    input.productionEnvironment === true ||
    input.environment?.toLowerCase() === "production" ||
    searchable.includes("production")
  );
}

function isExternalCommunication(input: RiskAssessmentInput, searchable: string) {
  return (
    input.externalCommunication === true ||
    searchable.includes("customer") ||
    searchable.includes("external") ||
    searchable.includes("@example.com")
  );
}

function hasSensitiveData(input: RiskAssessmentInput, searchable: string) {
  const sensitivity = input.dataSensitivity?.toUpperCase();

  return (
    sensitivity === "PRIVATE" ||
    sensitivity === "SENSITIVE" ||
    sensitivity === "CONFIDENTIAL" ||
    searchable.includes("ssn") ||
    searchable.includes("social security") ||
    searchable.includes("private") ||
    searchable.includes("sensitive") ||
    searchable.includes("confidential")
  );
}

function isDeleteAction(input: RiskAssessmentInput, searchable: string) {
  return input.action.toLowerCase().includes("delete") || searchable.includes("delete");
}

function isDatabaseWrite(input: RiskAssessmentInput, searchable: string) {
  const tool = input.tool.toString().toUpperCase();
  const action = input.action.toLowerCase();

  return (
    tool === ToolType.POSTGRES ||
    action.includes("query.write") ||
    searchable.includes("insert") ||
    searchable.includes("update") ||
    searchable.includes("delete from")
  );
}

function isPaymentOrRefund(input: RiskAssessmentInput, searchable: string) {
  const tool = input.tool.toString().toUpperCase();
  const action = input.action.toLowerCase();

  return (
    tool === ToolType.STRIPE ||
    action.includes("refund") ||
    action.includes("payment") ||
    searchable.includes("refund") ||
    searchable.includes("payment")
  );
}

function hasLegalLanguage(searchable: string) {
  return legalTerms.some((term) => searchable.includes(term));
}

function isUnusualAction(input: RiskAssessmentInput) {
  return !commonActions.has(input.action.toLowerCase());
}

function mapScoreToRiskLevel(score: number) {
  if (score <= 10) {
    return RiskLevel.NONE;
  }

  if (score <= 25) {
    return RiskLevel.LOW;
  }

  if (score <= 50) {
    return RiskLevel.MEDIUM;
  }

  if (score <= 80) {
    return RiskLevel.HIGH;
  }

  return RiskLevel.CRITICAL;
}

function buildExplanation(result: {
  level: RiskLevel;
  score: number;
  signals: Signal[];
}) {
  if (result.signals.length === 0) {
    return "No material risk signals were detected by local deterministic rules.";
  }

  const strongestSignals = result.signals
    .slice()
    .sort((left, right) => right.points - left.points)
    .slice(0, 3)
    .map((signal) => signal.label.toLowerCase());

  return `Local rules scored this ${result.level} risk at ${result.score} because of ${strongestSignals.join(", ")}.`;
}

export class RulesBasedRiskReviewer implements RiskReviewer {
  async assess(input: RiskAssessmentInput): Promise<RiskAssessmentResult> {
    const searchable = stringifySearchable(input);
    const amount = input.amount ?? 0;
    const signals: Signal[] = [];

    const addSignal = (signal: Signal, applies: boolean) => {
      if (applies) {
        signals.push(signal);
      }
    };

    addSignal(
      { key: "money_involved", label: "Money involved", points: 30 },
      amount > 0 || isPaymentOrRefund(input, searchable),
    );
    addSignal(
      { key: "amount_over_100", label: "Amount over 100", points: 10 },
      amount > 100,
    );
    addSignal(
      { key: "amount_over_500", label: "Amount over 500", points: 20 },
      amount > 500,
    );
    addSignal(
      { key: "amount_over_1000", label: "Amount over 1000", points: 30 },
      amount > 1000,
    );
    addSignal(
      {
        key: "external_customer_communication",
        label: "External customer communication",
        points: 20,
      },
      isExternalCommunication(input, searchable),
    );
    addSignal(
      { key: "production_environment", label: "Production environment", points: 25 },
      isProduction(input, searchable),
    );
    addSignal(
      { key: "irreversible_action", label: "Irreversible action", points: 30 },
      input.reversible === false,
    );
    addSignal(
      { key: "private_sensitive_data", label: "Private or sensitive data", points: 25 },
      hasSensitiveData(input, searchable),
    );
    addSignal(
      { key: "delete_action", label: "Delete action", points: 50 },
      isDeleteAction(input, searchable),
    );
    addSignal(
      { key: "database_write", label: "Database write", points: 25 },
      isDatabaseWrite(input, searchable),
    );
    addSignal(
      { key: "payment_refund_action", label: "Payment or refund action", points: 35 },
      isPaymentOrRefund(input, searchable),
    );
    addSignal(
      {
        key: "legal_compliance_action",
        label: "Legal or compliance action",
        points: 35,
      },
      hasLegalLanguage(searchable),
    );
    addSignal(
      { key: "high_risk_agent_tier", label: "High risk agent tier", points: 15 },
      input.agent?.riskTier === AgentRiskTier.HIGH,
    );
    addSignal(
      { key: "critical_agent_tier", label: "Critical agent tier", points: 25 },
      input.agent?.riskTier === AgentRiskTier.CRITICAL,
    );
    addSignal(
      { key: "tool_risk_level", label: "High risk tool", points: 15 },
      highRiskTools.includes(input.tool as ToolType),
    );
    addSignal(
      { key: "unusual_action_type", label: "Unusual action type", points: 10 },
      isUnusualAction(input),
    );
    addSignal(
      { key: "kill_switch_active", label: "Kill switch active", points: 100 },
      input.organization?.killSwitchEnabled === true,
    );

    const score = signals.reduce((total, signal) => total + signal.points, 0);
    const level = mapScoreToRiskLevel(score);

    return {
      score,
      level,
      signals: signals.map((signal) => signal.key),
      explanation: buildExplanation({ level, score, signals }),
      modelVersion: "rules-v1",
    };
  }
}

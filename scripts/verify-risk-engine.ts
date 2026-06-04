import { AgentRiskTier, RiskLevel, ToolType } from "../src/generated/prisma/client";
import { RiskEngine } from "../src/server/risk/risk-engine";

const engine = new RiskEngine();
const noneOrLow: RiskLevel[] = [RiskLevel.NONE, RiskLevel.LOW];
const highOrCritical: RiskLevel[] = [RiskLevel.HIGH, RiskLevel.CRITICAL];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasSignals(actualSignals: string[], expectedSignals: string[]) {
  return expectedSignals.every((signal) => actualSignals.includes(signal));
}

async function main() {
  const slack = await engine.assess({
    organization: { killSwitchEnabled: false },
    agent: { riskTier: AgentRiskTier.STANDARD },
    tool: ToolType.SLACK,
    action: "message.send",
    environment: "internal",
    payload: { channelType: "internal", text: "Daily support handoff" },
    reversible: true,
    externalCommunication: false,
    productionEnvironment: false,
    dataSensitivity: "INTERNAL",
  });

  assert(
    noneOrLow.includes(slack.level),
    `Expected Slack message to be LOW or NONE, got ${slack.level}`,
  );

  const refund = await engine.assess({
    organization: { killSwitchEnabled: false },
    agent: { riskTier: AgentRiskTier.HIGH },
    tool: ToolType.STRIPE,
    action: "refund.create",
    environment: "production",
    amount: 1200,
    currency: "USD",
    reason: "Customer refund request",
    payload: { customerId: "cus_demo", refundAmount: 1200 },
    reversible: false,
    externalCommunication: false,
    productionEnvironment: true,
    dataSensitivity: "INTERNAL",
  });

  assert(
    highOrCritical.includes(refund.level),
    `Expected $1,200 production refund to be HIGH or CRITICAL, got ${refund.level}`,
  );
  assert(
    hasSignals(refund.signals, [
      "money_involved",
      "payment_refund_action",
      "production_environment",
    ]),
    `Refund signals missing expected money/payment/production signals: ${refund.signals.join(", ")}`,
  );

  const customerDelete = await engine.assess({
    organization: { killSwitchEnabled: false },
    agent: { riskTier: AgentRiskTier.HIGH },
    tool: ToolType.CUSTOM,
    action: "customer.delete",
    environment: "production",
    reason: "Delete customer record",
    payload: { customerId: "cus_demo", includesPrivateData: true },
    reversible: false,
    externalCommunication: false,
    productionEnvironment: true,
    dataSensitivity: "PRIVATE",
  });

  assert(
    customerDelete.level === RiskLevel.CRITICAL,
    `Expected production customer delete to be CRITICAL, got ${customerDelete.level}`,
  );

  const databaseWrite = await engine.assess({
    organization: { killSwitchEnabled: false },
    agent: { riskTier: AgentRiskTier.CRITICAL },
    tool: ToolType.POSTGRES,
    action: "query.write",
    environment: "production",
    reason: "Update customer row",
    payload: { statementType: "UPDATE", table: "customers" },
    reversible: false,
    externalCommunication: false,
    productionEnvironment: true,
    dataSensitivity: "SENSITIVE",
  });

  assert(
    highOrCritical.includes(databaseWrite.level),
    `Expected production database write to be HIGH or CRITICAL, got ${databaseWrite.level}`,
  );

  console.log("Risk engine verification passed.");
  console.log({
    databaseWrite,
    refund,
    slack,
    customerDelete,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

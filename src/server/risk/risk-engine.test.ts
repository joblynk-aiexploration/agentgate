import { describe, expect, it } from "vitest";
import {
  AgentRiskTier,
  RiskLevel,
  ToolType,
} from "@/generated/prisma/client";
import { RulesBasedRiskReviewer } from "@/server/risk/rules-based-risk-reviewer";

const reviewer = new RulesBasedRiskReviewer();

describe("RulesBasedRiskReviewer", () => {
  it("scores an internal Slack message as none or low risk", async () => {
    const result = await reviewer.assess({
      organization: { killSwitchEnabled: false },
      agent: { riskTier: AgentRiskTier.STANDARD },
      tool: ToolType.SLACK,
      action: "message.send",
      environment: "development",
      payload: {
        channelType: "internal",
        text: "Internal status update",
      },
      externalCommunication: false,
      productionEnvironment: false,
      reversible: true,
    });

    expect([RiskLevel.NONE, RiskLevel.LOW]).toContain(result.level);
  });

  it("scores a $1,200 production refund as high or critical", async () => {
    const result = await reviewer.assess({
      organization: { killSwitchEnabled: false },
      agent: { riskTier: AgentRiskTier.HIGH },
      tool: ToolType.STRIPE,
      action: "refund.create",
      environment: "production",
      amount: 1200,
      currency: "USD",
      reason: "Customer was double charged",
      externalCommunication: true,
      productionEnvironment: true,
      reversible: false,
    });

    expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(result.level);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        "money_involved",
        "amount_over_500",
        "payment_refund_action",
        "production_environment",
      ]),
    );
  });

  it("scores deleting a customer record as critical", async () => {
    const result = await reviewer.assess({
      organization: { killSwitchEnabled: false },
      agent: { riskTier: AgentRiskTier.HIGH },
      tool: ToolType.CUSTOM,
      action: "customer.delete",
      environment: "production",
      payload: {
        customerId: "cus_123",
        containsSensitiveData: true,
      },
      dataSensitivity: "PRIVATE",
      externalCommunication: true,
      productionEnvironment: true,
      reversible: false,
    });

    expect(result.level).toBe(RiskLevel.CRITICAL);
    expect(result.signals).toContain("delete_action");
  });

  it("scores a production database write as high or critical", async () => {
    const result = await reviewer.assess({
      organization: { killSwitchEnabled: false },
      agent: { riskTier: AgentRiskTier.CRITICAL },
      tool: ToolType.POSTGRES,
      action: "query.write",
      environment: "production",
      payload: {
        statementType: "UPDATE",
        table: "customers",
      },
      dataSensitivity: "SENSITIVE",
      productionEnvironment: true,
      reversible: false,
    });

    expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(result.level);
    expect(result.signals).toContain("database_write");
  });
});

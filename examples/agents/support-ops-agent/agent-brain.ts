import type { TicketScenario, ToolIntent } from "./types";

export class AgentBrain {
  constructor(private readonly agentId: string) {}

  decide(scenario: TicketScenario): ToolIntent {
    const metadata = {
      agentName: "Support Operations Agent",
      scenario: scenario.name,
      ticketId: scenario.ticketId,
      ticketTitle: scenario.title,
      customerTier: scenario.customerTier ?? "standard",
      source: "support-ops-agent",
    };

    switch (scenario.name) {
      case "small-refund":
        return {
          agentId: this.agentId,
          tool: "stripe",
          action: "refund.create",
          environment: "production",
          amount: 45,
          currency: "USD",
          reason: "Customer was double charged for small amount.",
          payload: {
            amount: 45,
            currency: "USD",
            customerReference: "demo-customer-small-refund",
            refundMode: "simulated",
          },
          metadata,
        };
      case "large-refund":
        return {
          agentId: this.agentId,
          tool: "stripe",
          action: "refund.create",
          environment: "production",
          amount: 1200,
          currency: "USD",
          reason: "VIP customer was double charged.",
          payload: {
            amount: 1200,
            currency: "USD",
            customerReference: "demo-vip-customer",
            refundMode: "simulated",
          },
          metadata,
        };
      case "blocked-delete":
        return {
          agentId: this.agentId,
          tool: "postgres",
          action: "customer.delete",
          environment: "production",
          dataSensitivity: "customer",
          reversible: false,
          reason: "Customer requested deletion.",
          payload: {
            customerReference: "demo-customer-delete-request",
            operation: "delete_customer_record",
            simulated: true,
          },
          metadata,
        };
      case "external-email":
        return {
          agentId: this.agentId,
          tool: "email_preview",
          action: "email.send",
          environment: "production",
          externalCommunication: true,
          reason: "Customer should receive apology email.",
          payload: {
            recipient: "customer@example.com",
            subject: "We are sorry about your recent experience",
            body: "We apologize for the issue and are reviewing your account.",
            simulated: true,
          },
          metadata,
        };
      case "database-write":
        return {
          agentId: this.agentId,
          tool: "postgres",
          action: "customer.update",
          environment: "production",
          dataSensitivity: "customer",
          reversible: true,
          reason: "Correct customer support status.",
          payload: {
            customerReference: "demo-customer-status-update",
            field: "supportStatus",
            value: "reviewed",
            simulated: true,
          },
          metadata,
        };
    }
  }
}

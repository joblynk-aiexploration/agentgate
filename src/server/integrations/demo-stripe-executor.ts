import type {
  ToolExecutionInput,
  ToolExecutionResult,
  ToolExecutor,
} from "@/server/integrations/types";

function getAmount(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const amount = (payload as Record<string, unknown>).amount;

  return typeof amount === "number" ? amount : null;
}

function getCurrency(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const currency = (payload as Record<string, unknown>).currency;

  return typeof currency === "string" ? currency : null;
}

export class DemoStripeExecutor implements ToolExecutor {
  async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    const isRefund = input.action.toLowerCase() === "refund.create";
    const simulatedRefundId = `sim_rf_${input.actionRequestId.slice(0, 12)}`;

    return {
      executor: "stripe_test_mode",
      message: isRefund
        ? "Simulated Stripe test-mode refund. No Stripe API call was made."
        : "Simulated Stripe test-mode action. No Stripe API call was made.",
      output: {
        amount: getAmount(input.payload),
        currency: getCurrency(input.payload),
        environment: input.environment,
        refundId: isRefund ? simulatedRefundId : null,
        simulatedStripeMode: "test",
      },
      simulated: true,
      success: true,
    };
  }
}

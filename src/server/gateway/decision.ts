import {
  ActionDecision,
  ActionStatus,
} from "@/generated/prisma/client";
import type { GatewayCheckRequest } from "@/server/gateway/types";

function isProductionEnvironment(input: Pick<GatewayCheckRequest, "environment" | "productionEnvironment">) {
  return (
    input.productionEnvironment === true ||
    input.environment.toLowerCase() === "production"
  );
}

export function mapGatewayDecisionToStatus(
  decision: ActionDecision,
  input: Pick<GatewayCheckRequest, "environment" | "productionEnvironment">,
) {
  if (decision === ActionDecision.BLOCK) {
    return {
      allowed: false,
      requiresApproval: false,
      status: ActionStatus.BLOCKED,
    };
  }

  if (decision === ActionDecision.REQUIRE_APPROVAL) {
    return {
      allowed: false,
      requiresApproval: true,
      status: ActionStatus.PENDING_APPROVAL,
    };
  }

  if (decision === ActionDecision.SANDBOX_ONLY) {
    const allowed = !isProductionEnvironment(input);

    return {
      allowed,
      requiresApproval: false,
      status: allowed ? ActionStatus.ALLOWED : ActionStatus.BLOCKED,
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    status: ActionStatus.ALLOWED,
  };
}

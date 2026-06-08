import { addOrderEvent, readAdminConfig, readStore, updateOrder } from "@/lib/store";
import type { Order, OrderEvent } from "@/lib/types";

type GatewayActionStatus = {
  actionRequestId: string;
  status: string;
  approvalRequest?: {
    id: string;
    status: string;
  };
};

type GatewayExecution = {
  actionRequestId: string;
  executed: boolean;
  result?: unknown;
  status: string;
};

type SyncResult = {
  checked: number;
  executed: number;
  skipped: number;
  updatedOrders: string[];
};

function gatewayBaseUrl() {
  return readAdminConfig().agentGateBaseUrl.replace(/\/$/, "");
}

function authorizationHeader() {
  const apiKey = readAdminConfig().agentGateApiKey;

  if (!apiKey) {
    throw new Error("AgentGate API key is not configured.");
  }

  return `Bearer ${apiKey}`;
}

async function getActionStatus(actionRequestId: string) {
  const response = await fetch(
    `${gatewayBaseUrl()}/api/gateway/actions/${encodeURIComponent(actionRequestId)}`,
    {
      headers: {
        Authorization: authorizationHeader(),
      },
      method: "GET",
    },
  );
  const body = (await response.json().catch(() => ({}))) as GatewayActionStatus & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? "AgentGate action status check failed.");
  }

  return body;
}

async function executeAction(actionRequestId: string) {
  const response = await fetch(`${gatewayBaseUrl()}/api/gateway/execute`, {
    body: JSON.stringify({ actionRequestId }),
    headers: {
      Authorization: authorizationHeader(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json().catch(() => ({}))) as GatewayExecution & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? "AgentGate safe demo execution failed.");
  }

  return body;
}

function canSyncCancellation(order: Order, status: GatewayActionStatus) {
  return (
    order.status === "processing" &&
    order.eligibleForCancellation &&
    status.status === "APPROVED" &&
    status.approvalRequest?.status === "APPROVED"
  );
}

function isCancellationApprovalEvent(event: OrderEvent) {
  return (
    (event.type === "agentgate_pending_approval" ||
      event.type === "cancellation.approval_required") &&
    (event.metadata?.action === "order.cancel" ||
      event.message.startsWith("Cancellation for "))
  );
}

function pendingCancellationAction(order: Order) {
  const event = [...order.events]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .find(isCancellationApprovalEvent);

  if (
    typeof event?.metadata?.actionRequestId !== "string" ||
    !event.metadata.actionRequestId
  ) {
    return null;
  }

  return {
    actionRequestId: event.metadata.actionRequestId,
    approvalRequestId:
      typeof event.metadata.approvalRequestId === "string"
        ? event.metadata.approvalRequestId
        : undefined,
  };
}

export async function syncApprovedAgentGateOrders(): Promise<SyncResult> {
  const pendingOrders = readStore().orders.filter((order) =>
    Boolean(pendingCancellationAction(order)),
  );
  const result: SyncResult = {
    checked: pendingOrders.length,
    executed: 0,
    skipped: 0,
    updatedOrders: [],
  };

  for (const order of pendingOrders) {
    const pendingCancellation = pendingCancellationAction(order);

    if (!pendingCancellation) {
      result.skipped += 1;
      continue;
    }

    const status = await getActionStatus(pendingCancellation.actionRequestId);

    if (!canSyncCancellation(order, status)) {
      result.skipped += 1;
      continue;
    }

    const execution = await executeAction(pendingCancellation.actionRequestId);

    if (!execution.executed || execution.status !== "EXECUTED") {
      result.skipped += 1;
      continue;
    }

    const updated: Order = {
      ...order,
      agentActions: [
        `Cancelled after AgentGate approval sync at ${new Date().toISOString()}`,
        ...order.agentActions,
      ],
      eligibleForCancellation: false,
      pendingActionRequestId: undefined,
      pendingApprovalRequestId: undefined,
      status: "cancelled",
    };

    updateOrder(updated);
    addOrderEvent(updated, {
      message:
        "Admin demo sync executed the approved AgentGate action and cancelled the local order.",
      title: "Approved cancellation executed",
      description:
        "An admin synced the approved AgentGate action. Northstar simulated cancellation locally.",
      actorType: "agentgate",
      actorLabel: "AgentGate execute",
      visibleToCustomer: true,
      metadata: {
        actionRequestId: pendingCancellation.actionRequestId,
        approvalRequestId:
          status.approvalRequest?.id ?? pendingCancellation.approvalRequestId,
        executionStatus: execution.status,
        simulated: true,
      },
      type: "cancellation.approved",
    });

    result.executed += 1;
    result.updatedOrders.push(order.number);
  }

  return result;
}

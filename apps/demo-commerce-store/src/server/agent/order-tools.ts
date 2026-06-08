import { formatCurrency } from "@/lib/format";
import {
  addOrderEvent,
  findLatestOrderForCustomer,
  findOrder,
  findOrderForCustomer,
  readStore,
  updateOrder,
  writeStore,
} from "@/lib/store";
import type { Order } from "@/lib/types";
import { checkWithAgentGate } from "@/server/agent/agentgate-client";
import type { AgentGateDecisionSummary, RoutedIntent } from "@/server/agent/types";

type CustomerContext = {
  id: string;
  email: string;
  name: string;
};

function summarize(decision: Awaited<ReturnType<typeof checkWithAgentGate>>): AgentGateDecisionSummary {
  return {
    actionRequestId: decision.actionRequestId,
    approvalRequestId: decision.approvalRequestId,
    decision: decision.decision,
    riskLevel: decision.risk.level,
    riskScore: decision.risk.score,
  };
}

function missingOrder() {
  return {
    reply: "Please log in, or include both a valid demo order number and email address so I can verify ownership.",
    status: "missing_order",
  };
}

function resolveOrder(intent: RoutedIntent, customer?: CustomerContext) {
  if (customer) {
    if (intent.orderNumber) {
      return findOrderForCustomer(intent.orderNumber, customer.id);
    }

    if (intent.latestOrder) {
      return findLatestOrderForCustomer(customer.id);
    }

    return null;
  }

  if (!intent.orderNumber || !intent.email) {
    return null;
  }

  return findOrder(intent.orderNumber, intent.email);
}

function agentGateMetadata(order: Order, extra?: Record<string, unknown>) {
  return {
    source: "northstar-demo-store",
    customerEmail: order.email,
    orderNumber: order.number,
    orderStatus: order.status,
    customerFacing: true,
    createdThroughCheckout: order.createdThroughCheckout,
    ...(extra ?? {}),
  };
}

function orderPayload(order: Order) {
  return {
    orderNumber: order.number,
    customerEmail: order.email,
    items: order.items,
    total: order.total,
    status: order.status,
  };
}

function markPending(
  order: Order,
  gate: AgentGateDecisionSummary,
  message: string,
  action: string,
) {
  const updated = addOrderEvent(
    {
      ...order,
      pendingActionRequestId: gate.actionRequestId,
      pendingApprovalRequestId: gate.approvalRequestId,
    },
    {
      type: "agentgate_pending_approval",
      message,
      metadata: {
        action,
        actionRequestId: gate.actionRequestId,
        approvalRequestId: gate.approvalRequestId,
      },
    },
  );

  return updated;
}

export async function cancelOrder(intent: RoutedIntent, customer?: CustomerContext) {
  const order = resolveOrder(intent, customer);

  if (!order) {
    return missingOrder();
  }

  const decision = await checkWithAgentGate({
    action: "order.cancel",
    amount: order.total,
    currency: "USD",
    metadata: agentGateMetadata(order),
    payload: orderPayload(order),
    reason: `Customer requested cancellation for order ${order.number}.`,
    reversible: false,
    tool: "demo_commerce",
  });
  const gate = summarize(decision);

  if (decision.decision === "ALLOW" || decision.decision === "LOG_ONLY") {
    if (!order.eligibleForCancellation || order.status !== "processing") {
      const blocked = addOrderEvent(order, {
        type: "agentgate_blocked",
        message: "Local order state prevented cancellation after AgentGate allowed review.",
      });
      return {
        agentGateDecision: gate,
        orderUpdate: blocked,
        reply: `AgentGate allowed the check, but ${order.number} is not cancellable in the local store.`,
        status: "blocked",
      };
    }

    const updated = {
      ...order,
      agentActions: [`Cancelled by Northstar Assistant at ${new Date().toISOString()}`, ...order.agentActions],
      eligibleForCancellation: false,
      status: "cancelled" as const,
      pendingActionRequestId: undefined,
      pendingApprovalRequestId: undefined,
    };
    updateOrder(updated);
    const withEvent = addOrderEvent(updated, {
      type: "cancelled",
      message: "AgentGate allowed cancellation, so the local demo order was cancelled.",
      metadata: { actionRequestId: gate.actionRequestId },
    });

    return {
      agentGateDecision: gate,
      orderUpdate: withEvent,
      reply: `I cancelled ${order.number} in the local demo store. No real payment or fulfillment system was touched.`,
      status: "completed",
    };
  }

  if (decision.decision === "REQUIRE_APPROVAL") {
    const updated = markPending(
      order,
      gate,
      `Cancellation for ${order.number} needs AgentGate reviewer approval before local order state changes.`,
      "order.cancel",
    );

    return {
      agentGateDecision: gate,
      orderUpdate: updated,
      reply:
        "I need approval before I can complete that. Your request has been sent for review.",
      status: "pending_approval",
    };
  }

  const blocked = addOrderEvent(order, {
    type: "agentgate_blocked",
    message: `AgentGate blocked cancellation: ${decision.reason}`,
    metadata: { actionRequestId: gate.actionRequestId, decision: decision.decision },
  });

  return {
    agentGateDecision: gate,
    orderUpdate: blocked,
    reply: `I cannot cancel ${order.number}. AgentGate blocked the request: ${decision.reason}`,
    status: "blocked",
  };
}

export async function resendReceipt(intent: RoutedIntent, customer?: CustomerContext) {
  const order = resolveOrder(intent, customer);

  if (!order) {
    return missingOrder();
  }

  const decision = await checkWithAgentGate({
    action: "receipt.resend",
    amount: order.total,
    currency: "USD",
    externalCommunication: true,
    metadata: agentGateMetadata(order, { externalCommunication: true }),
    payload: {
      ...orderPayload(order),
      recipient: order.email,
      subject: `Receipt for ${order.number}`,
    },
    reason: `Customer requested receipt resend for order ${order.number}.`,
    tool: "email_preview",
  });
  const gate = summarize(decision);

  if (decision.decision === "ALLOW" || decision.decision === "LOG_ONLY") {
    const store = readStore();
    store.receipts = [
      {
        id: `receipt-${Date.now()}`,
        email: order.email,
        orderNumber: order.number,
        previewOnly: true,
        sentAt: new Date().toISOString(),
      },
      ...store.receipts,
    ];
    writeStore(store);
    const updated = addOrderEvent(
      {
        ...order,
        agentActions: [`Receipt resend simulated at ${new Date().toISOString()}`, ...order.agentActions],
      },
      {
        type: "receipt_previewed",
        message: "Receipt preview was simulated locally after AgentGate check.",
        metadata: { actionRequestId: gate.actionRequestId },
      },
    );

    return {
      agentGateDecision: gate,
      orderUpdate: updated,
      reply: `I simulated a receipt preview for ${order.number} to ${order.email}. No real email was sent.`,
      status: "completed",
    };
  }

  if (decision.decision === "REQUIRE_APPROVAL") {
    const updated = markPending(
      order,
      gate,
      `Receipt resend for ${order.number} needs reviewer approval.`,
      "receipt.resend",
    );
    return {
      agentGateDecision: gate,
      orderUpdate: updated,
      reply: "I routed the receipt resend through AgentGate and it needs reviewer approval first.",
      status: "pending_approval",
    };
  }

  return {
    agentGateDecision: gate,
    orderUpdate: addOrderEvent(order, {
      type: "agentgate_blocked",
      message: `AgentGate blocked receipt resend: ${decision.reason}`,
    }),
    reply: `AgentGate blocked the receipt resend for ${order.number}: ${decision.reason}`,
    status: "blocked",
  };
}

export async function requestReturn(intent: RoutedIntent, customer?: CustomerContext) {
  const order = resolveOrder(intent, customer);

  if (!order) {
    return missingOrder();
  }

  const decision = await checkWithAgentGate({
    action: "order.return_request",
    amount: order.total,
    currency: "USD",
    metadata: agentGateMetadata(order),
    payload: orderPayload(order),
    reason: `Customer requested return for ${order.number}.`,
    tool: "demo_commerce",
  });
  const gate = summarize(decision);

  if ((decision.decision === "ALLOW" || decision.decision === "LOG_ONLY") && order.eligibleForReturn) {
    const updated = {
      ...order,
      agentActions: [`Return request simulated at ${new Date().toISOString()}`, ...order.agentActions],
      status: "return_requested" as const,
    };
    updateOrder(updated);
    return {
      agentGateDecision: gate,
      orderUpdate: addOrderEvent(updated, {
        type: "return_requested",
        message: "Local demo return request was opened after AgentGate check.",
      }),
      reply: `I opened a local demo return request for ${order.number}. No label or refund was created.`,
      status: "completed",
    };
  }

  if (decision.decision === "REQUIRE_APPROVAL") {
    return {
      agentGateDecision: gate,
      orderUpdate: markPending(
        order,
        gate,
        `Return request for ${order.number} needs reviewer approval.`,
        "order.return_request",
      ),
      reply: `A return request for ${order.number} (${formatCurrency(order.total)}) needs approval before I can change the order.`,
      status: "pending_approval",
    };
  }

  return {
    agentGateDecision: gate,
    reply: `I cannot create that return request. AgentGate decision: ${decision.decision}.`,
    status: "blocked",
  };
}

export async function updateShippingAddress(intent: RoutedIntent, customer?: CustomerContext) {
  const order = resolveOrder(intent, customer);

  if (!order) {
    return missingOrder();
  }

  const decision = await checkWithAgentGate({
    action: "order.update_shipping_address",
    amount: order.total,
    currency: "USD",
    dataSensitivity: "PRIVATE",
    metadata: agentGateMetadata(order),
    payload: { ...orderPayload(order), redactedAddress: "Provided in chat - redacted in demo log" },
    reason: `Customer requested shipping address update for ${order.number}.`,
    tool: "demo_commerce",
  });
  const gate = summarize(decision);

  if (decision.decision === "ALLOW" || decision.decision === "LOG_ONLY") {
    return {
      agentGateDecision: gate,
      orderUpdate: addOrderEvent(order, {
        type: "shipping_update_requested",
        message: "Shipping address update was simulated locally after AgentGate check.",
      }),
      reply: `I simulated an address update request for ${order.number}. No carrier or fulfillment system was touched.`,
      status: "completed",
    };
  }

  if (decision.decision === "REQUIRE_APPROVAL") {
    return {
      agentGateDecision: gate,
      orderUpdate: markPending(
        order,
        gate,
        `Address update for ${order.number} needs reviewer approval.`,
        "order.shipping_address_update",
      ),
      reply: "Address updates involve private customer data, so I sent this to AgentGate for approval.",
      status: "pending_approval",
    };
  }

  return {
    agentGateDecision: gate,
    reply: `AgentGate blocked the address update: ${decision.reason}`,
    status: "blocked",
  };
}

export async function deleteCustomerData(email?: string) {
  const decision = await checkWithAgentGate({
    action: "customer.delete",
    dataSensitivity: "PRIVATE",
    metadata: { customerEmail: email ?? "unknown", source: "northstar-demo-store", customerFacing: true },
    payload: { customerEmail: email ?? "unknown" },
    reason: "Customer requested deletion of their local demo customer record.",
    reversible: false,
    tool: "demo_commerce",
  });

  return {
    agentGateDecision: summarize(decision),
    reply: `AgentGate ${decision.decision === "BLOCK" ? "blocked" : "reviewed"} the customer data deletion request. In V1, no customer record was deleted.`,
    status: decision.decision === "BLOCK" ? "blocked" : "pending_approval",
  };
}

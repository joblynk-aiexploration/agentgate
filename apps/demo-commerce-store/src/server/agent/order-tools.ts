import { formatCurrency } from "@/lib/format";
import { findOrder, readStore, updateOrder, writeStore } from "@/lib/store";
import { checkWithAgentGate } from "@/server/agent/agentgate-client";
import type { AgentGateDecisionSummary } from "@/server/agent/types";

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
    reply: "Please include a valid demo order number and email address so I can verify ownership.",
    status: "missing_order",
  };
}

export async function cancelOrder(orderNumber?: string, email?: string) {
  if (!orderNumber || !email) {
    return missingOrder();
  }

  const order = findOrder(orderNumber, email);

  if (!order) {
    return { reply: "I could not find that demo order.", status: "not_found" };
  }

  const decision = await checkWithAgentGate({
    action: "order.cancel",
    amount: order.total,
    currency: "USD",
    metadata: {
      customerEmail: order.email,
      orderStatus: order.status,
    },
    payload: {
      customerEmail: order.email,
      orderId: order.number,
      total: order.total,
    },
    reason: `Customer requested cancellation for order ${order.number}.`,
    reversible: false,
    tool: "demo_commerce",
  });

  const gate = summarize(decision);

  if (decision.decision === "ALLOW" || decision.decision === "LOG_ONLY") {
    const updated = {
      ...order,
      agentActions: [`Cancelled by Northstar Assistant at ${new Date().toISOString()}`, ...order.agentActions],
      eligibleForCancellation: false,
      status: "cancelled" as const,
    };
    updateOrder(updated);

    return {
      agentGateDecision: gate,
      orderUpdate: updated,
      reply: `I cancelled ${order.number} in the local demo store. No real payment or fulfillment system was touched.`,
      status: "completed",
    };
  }

  if (decision.decision === "REQUIRE_APPROVAL") {
    return {
      agentGateDecision: gate,
      reply:
        "I need approval before I can complete that. Your request has been sent for review.",
      status: "pending_approval",
    };
  }

  return {
    agentGateDecision: gate,
    reply: `I cannot cancel ${order.number}. AgentGate blocked the request: ${decision.reason}`,
    status: "blocked",
  };
}

export async function resendReceipt(orderNumber?: string, email?: string) {
  if (!orderNumber || !email) {
    return missingOrder();
  }

  const order = findOrder(orderNumber, email);
  if (!order) {
    return { reply: "I could not find that demo order.", status: "not_found" };
  }

  const decision = await checkWithAgentGate({
    action: "receipt.resend",
    amount: order.total,
    currency: "USD",
    externalCommunication: true,
    metadata: {
      customerEmail: order.email,
      externalCommunication: true,
    },
    payload: {
      orderId: order.number,
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
        sentAt: new Date().toISOString(),
      },
      ...store.receipts,
    ];
    writeStore(store);
    updateOrder({
      ...order,
      agentActions: [`Receipt resend simulated at ${new Date().toISOString()}`, ...order.agentActions],
    });
    return {
      agentGateDecision: gate,
      reply: `I simulated a receipt preview for ${order.number} to ${order.email}. No real email was sent.`,
      status: "completed",
    };
  }

  if (decision.decision === "REQUIRE_APPROVAL") {
    return {
      agentGateDecision: gate,
      reply: "I routed the receipt resend through AgentGate and it needs reviewer approval first.",
      status: "pending_approval",
    };
  }

  return {
    agentGateDecision: gate,
    reply: `AgentGate blocked the receipt resend for ${order.number}: ${decision.reason}`,
    status: "blocked",
  };
}

export async function requestReturn(orderNumber?: string, email?: string) {
  if (!orderNumber || !email) {
    return missingOrder();
  }

  const order = findOrder(orderNumber, email);
  if (!order) {
    return { reply: "I could not find that demo order.", status: "not_found" };
  }

  const decision = await checkWithAgentGate({
    action: "return.request",
    amount: order.total,
    currency: "USD",
    metadata: {
      customerEmail: order.email,
      orderStatus: order.status,
    },
    payload: { orderId: order.number, total: order.total },
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
      orderUpdate: updated,
      reply: `I opened a local demo return request for ${order.number}. No label or refund was created.`,
      status: "completed",
    };
  }

  if (decision.decision === "REQUIRE_APPROVAL") {
    return {
      agentGateDecision: gate,
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

export async function updateShippingAddress(orderNumber?: string, email?: string) {
  if (!orderNumber || !email) {
    return missingOrder();
  }

  const order = findOrder(orderNumber, email);
  if (!order) {
    return { reply: "I could not find that demo order.", status: "not_found" };
  }

  const decision = await checkWithAgentGate({
    action: "shipping_address.update",
    amount: order.total,
    currency: "USD",
    dataSensitivity: "PRIVATE",
    metadata: { customerEmail: order.email, orderStatus: order.status },
    payload: { orderId: order.number, redactedAddress: "Provided in chat - redacted in demo log" },
    reason: `Customer requested shipping address update for ${order.number}.`,
    tool: "demo_commerce",
  });

  return {
    agentGateDecision: summarize(decision),
    reply:
      decision.decision === "ALLOW" || decision.decision === "LOG_ONLY"
        ? `I simulated an address update request for ${order.number}. No carrier or fulfillment system was touched.`
        : decision.decision === "REQUIRE_APPROVAL"
          ? "Address updates involve private customer data, so I sent this to AgentGate for approval."
          : `AgentGate blocked the address update: ${decision.reason}`,
    status:
      decision.decision === "ALLOW" || decision.decision === "LOG_ONLY"
        ? "completed"
        : decision.decision === "REQUIRE_APPROVAL"
          ? "pending_approval"
          : "blocked",
  };
}

export async function deleteCustomerData(email?: string) {
  const decision = await checkWithAgentGate({
    action: "customer.delete",
    dataSensitivity: "PRIVATE",
    metadata: { customerEmail: email ?? "unknown" },
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

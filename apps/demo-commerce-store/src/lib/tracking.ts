import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import type { AgentLog, Order, OrderEvent, Receipt, StoreData } from "@/lib/types";

export function customerEvents(order: Order) {
  return order.events.filter((event) => event.visibleToCustomer !== false);
}

export function latestOrderEvent(order: Order) {
  return order.events[0] ?? null;
}

export function fulfillmentLabel(order: Order) {
  if (order.status === "cancelled") {
    return "Cancelled";
  }

  if (order.status === "return_requested") {
    return "Return requested";
  }

  return titleCase(order.status);
}

export function estimatedDelivery(order: Order) {
  const created = new Date(order.createdAt);
  const days = order.status === "delivered" ? 0 : order.status === "shipped" ? 2 : 5;
  created.setDate(created.getDate() + days);

  return formatDate(created.toISOString());
}

export function demoTrackingNumber(order: Order) {
  return `NST-${order.number.replace(/\D/g, "").padStart(6, "0")}`;
}

export function itemCount(order: Order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function orderHasPendingApproval(order: Order) {
  return Boolean(order.pendingApprovalRequestId);
}

export function orderSupportEvents(order: Order) {
  return order.events.filter(
    (event) =>
      event.type.includes("agentgate") ||
      event.type.includes("cancellation") ||
      event.type.includes("return") ||
      event.type.includes("receipt"),
  );
}

export function metricsForStore(store: StoreData) {
  const ordersToday = store.orders.filter((order) =>
    new Date(order.createdAt).toDateString() === new Date().toDateString(),
  );
  const revenue = store.orders.reduce((sum, order) => sum + order.total, 0);
  const pendingApprovals = store.orders.filter(orderHasPendingApproval);
  const blockedActions = store.agentLogs.filter((log) => log.decision === "BLOCK");
  const receipts = store.receipts.length;

  return {
    averageOrderValue: store.orders.length ? formatCurrency(revenue / store.orders.length) : "$0.00",
    blockedActions: blockedActions.length,
    ordersToday: ordersToday.length,
    pendingApprovals: pendingApprovals.length,
    pendingCancellations: pendingApprovals.filter((order) =>
      order.events.some((event) => event.type === "cancellation.approval_required" || event.message.includes("Cancellation")),
    ).length,
    pendingReturns: store.orders.filter((order) => order.status === "return_requested").length,
    processingOrders: store.orders.filter((order) => order.status === "processing").length,
    receiptsResent: receipts,
    revenue,
    totalOrders: store.orders.length,
  };
}

export function recentAgentLogsForOrder(logs: AgentLog[], order: Order) {
  return logs.filter((log) => log.orderNumber === order.number || log.customerEmail === order.email);
}

export function safeEventSummary(event: OrderEvent) {
  return `${event.title ?? titleCase(event.type)} - ${event.description ?? event.message}`;
}

export function receiptsForCustomer(receipts: Receipt[], email: string) {
  return receipts.filter((receipt) => receipt.email.toLowerCase() === email.toLowerCase());
}

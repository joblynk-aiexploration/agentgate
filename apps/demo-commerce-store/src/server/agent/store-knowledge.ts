import { formatCurrency, formatDate } from "@/lib/format";
import { findLatestOrderForCustomer, findOrder, findOrderForCustomer, readStore } from "@/lib/store";
import type { RoutedIntent } from "@/server/agent/types";

export function answerProductQuestion(intent: RoutedIntent) {
  const store = readStore();
  const query = intent.query.toLowerCase();
  const matches = store.products.filter(
    (product) =>
      query.includes(product.category.toLowerCase().split(" ")[0] ?? "") ||
      query.includes(product.name.toLowerCase().split(" ")[0] ?? "") ||
      product.description.toLowerCase().includes(query),
  );
  const products = matches.length ? matches : store.products.slice(0, 4);

  return `Northstar carries ${products
    .map((product) => `${product.name} (${formatCurrency(product.price)})`)
    .join(", ")}. ${products[0]?.description ?? "Everything is local demo inventory."}`;
}

export function answerPolicyQuestion(message: string) {
  const text = message.toLowerCase();

  if (text.includes("return")) {
    return "Returns are demo-only. Delivered orders can request a return within 30 days if the item is unused. No real labels or refunds are created.";
  }

  if (
    text.includes("privacy") ||
    text.includes("customer email") ||
    text.includes("customer data") ||
    text.includes("all customer")
  ) {
    return "I can't share customer emails or private customer data. Northstar uses local demo data only, and sensitive customer-data requests stay restricted through AgentGate.";
  }

  if (text.includes("international")) {
    return "Northstar ships demo orders within the United States only. International shipping is listed as coming soon.";
  }

  return "Demo shipping is free over $100, processing orders can be cancelled, shipped orders cannot be cancelled, and delivered orders may request a simulated return.";
}

export function answerOrderStatus(intent: RoutedIntent, customer?: { id: string; email: string }) {
  const order = customer
    ? intent.orderNumber
      ? findOrderForCustomer(intent.orderNumber, customer.id)
      : intent.latestOrder
        ? findLatestOrderForCustomer(customer.id)
        : undefined
    : intent.orderNumber && intent.email
      ? findOrder(intent.orderNumber, intent.email)
      : undefined;

  if (!order && customer && !intent.orderNumber && !intent.latestOrder) {
    return "I can help with your orders. Ask about a specific order number or say “Where is my latest order?”";
  }

  if (!order && !customer) {
    return "I can look that up after you log in, or send both your order number and email address.";
  }

  if (!order) {
    return "I could not find a matching local checkout order for that customer.";
  }

  return `${order.number} is currently ${order.status}. Created: ${formatDate(order.createdAt)}. Total: ${formatCurrency(order.total)}. Items: ${order.items
    .map((item) => item.name)
    .join(", ")}.`;
}

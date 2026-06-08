import { formatCurrency } from "@/lib/format";
import { findOrder, readStore } from "@/lib/store";
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

  if (text.includes("privacy")) {
    return "Northstar uses local demo data only. Customer data delete requests are intentionally blocked through AgentGate in this V1 demo.";
  }

  if (text.includes("international")) {
    return "Northstar ships demo orders within the United States only. International shipping is listed as coming soon.";
  }

  return "Demo shipping is free over $100, processing orders can be cancelled, shipped orders cannot be cancelled, and delivered orders may request a simulated return.";
}

export function answerOrderStatus(orderNumber: string | undefined, email: string | undefined) {
  if (!orderNumber || !email) {
    return "I can look that up. Please send the order number and email, for example: Where is my order NS-1001? sarah@example.com";
  }

  const order = findOrder(orderNumber, email);

  if (!order) {
    return "I could not find a matching demo order for that order number and email.";
  }

  return `${order.number} is currently ${order.status}. Total: ${formatCurrency(order.total)}. Items: ${order.items
    .map((item) => item.name)
    .join(", ")}.`;
}

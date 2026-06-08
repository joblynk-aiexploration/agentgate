import type { RoutedIntent } from "@/server/agent/types";

function extractOrderNumber(message: string) {
  return message.match(/\bNS-\d{4}\b/i)?.[0].toUpperCase();
}

function extractEmail(message: string) {
  return message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0].toLowerCase();
}

export function routeIntent(message: string): RoutedIntent {
  const text = message.toLowerCase();
  const base = {
    email: extractEmail(message),
    orderNumber: extractOrderNumber(message),
    query: message,
  };

  if (text.includes("cancel")) {
    return { ...base, intent: "cancel_order" };
  }

  if (text.includes("receipt") || text.includes("invoice")) {
    return { ...base, intent: "resend_receipt" };
  }

  if (text.includes("return")) {
    return { ...base, intent: "return_request" };
  }

  if (text.includes("delete") || text.includes("erase my") || text.includes("remove my data")) {
    return { ...base, intent: "delete_customer_data" };
  }

  if (text.includes("address")) {
    return { ...base, intent: "update_shipping_address" };
  }

  if (base.orderNumber || text.includes("where is my order") || text.includes("track")) {
    return { ...base, intent: "order_status" };
  }

  if (
    text.includes("shipping") ||
    text.includes("privacy") ||
    text.includes("policy") ||
    text.includes("international")
  ) {
    return { ...base, intent: "policy_question" };
  }

  if (
    text.includes("backpack") ||
    text.includes("jacket") ||
    text.includes("boot") ||
    text.includes("tent") ||
    text.includes("bottle") ||
    text.includes("glove") ||
    text.includes("light") ||
    text.includes("organizer")
  ) {
    return { ...base, intent: "product_question" };
  }

  if (text.includes("product") || text.includes("sell") || text.includes("recommend")) {
    return { ...base, intent: "product_search" };
  }

  return { ...base, intent: "fallback" };
}

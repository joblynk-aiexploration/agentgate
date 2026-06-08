import { answerOrderStatus, answerPolicyQuestion, answerProductQuestion } from "@/server/agent/store-knowledge";
import { routeIntent } from "@/server/agent/intent-router";
import {
  cancelOrder,
  deleteCustomerData,
  requestReturn,
  resendReceipt,
  updateShippingAddress,
} from "@/server/agent/order-tools";
import { rememberConversation } from "@/server/agent/conversation-memory";
import type { AgentChatInput, AgentChatResponse } from "@/server/agent/types";

export async function runCommerceAgent(input: AgentChatInput): Promise<AgentChatResponse> {
  const routed = routeIntent(input.message);
  let response: AgentChatResponse;

  try {
    if (routed.intent === "product_question" || routed.intent === "product_search") {
      response = {
        intent: routed.intent,
        reply: answerProductQuestion(routed),
        orderUpdate: null,
      };
    } else if (routed.intent === "policy_question") {
      response = {
        intent: routed.intent,
        reply: answerPolicyQuestion(input.message),
        orderUpdate: null,
      };
    } else if (routed.intent === "order_status") {
      response = {
        intent: routed.intent,
        reply: answerOrderStatus(routed.orderNumber, routed.email),
        orderUpdate: null,
      };
    } else if (routed.intent === "cancel_order") {
      const result = await cancelOrder(routed.orderNumber, routed.email);
      response = { intent: routed.intent, ...result };
    } else if (routed.intent === "resend_receipt") {
      const result = await resendReceipt(routed.orderNumber, routed.email);
      response = { intent: routed.intent, ...result };
    } else if (routed.intent === "return_request") {
      const result = await requestReturn(routed.orderNumber, routed.email);
      response = { intent: routed.intent, ...result };
    } else if (routed.intent === "update_shipping_address") {
      const result = await updateShippingAddress(routed.orderNumber, routed.email);
      response = { intent: routed.intent, ...result };
    } else if (routed.intent === "delete_customer_data") {
      const result = await deleteCustomerData(routed.email);
      response = { intent: routed.intent, ...result };
    } else {
      response = {
        intent: "fallback",
        orderUpdate: null,
        reply:
          "I can help with products, policies, order status, cancellation requests, receipt resends, returns, and demo data requests. Business actions are checked by AgentGate first.",
      };
    }
  } catch (error) {
    response = {
      intent: routed.intent,
      orderUpdate: null,
      reply: error instanceof Error ? error.message : "The local demo agent could not complete that request.",
    };
  }

  rememberConversation(input, response);

  return response;
}

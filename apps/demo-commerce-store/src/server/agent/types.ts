export type AgentIntent =
  | "product_search"
  | "product_question"
  | "policy_question"
  | "order_status"
  | "cancel_order"
  | "resend_receipt"
  | "return_request"
  | "update_shipping_address"
  | "delete_customer_data"
  | "fallback";

export type RoutedIntent = {
  intent: AgentIntent;
  orderNumber?: string;
  email?: string;
  query: string;
};

export type AgentGateDecisionSummary = {
  actionRequestId?: string;
  approvalRequestId?: string;
  decision: string;
  riskLevel?: string;
  riskScore?: number;
};

export type AgentChatInput = {
  sessionId: string;
  message: string;
};

export type AgentChatResponse = {
  reply: string;
  intent: AgentIntent;
  agentGateDecision?: AgentGateDecisionSummary;
  orderUpdate?: unknown;
};

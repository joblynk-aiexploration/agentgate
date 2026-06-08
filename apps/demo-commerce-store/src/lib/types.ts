export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  features: string[];
};

export type StoreUserRole = "customer" | "admin";

export type StoreUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: StoreUserRole;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
};

export type StoreSession = {
  id: string;
  userId: string;
  role: StoreUserRole;
  createdAt: string;
  expiresAt: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type Cart = {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

export type ShippingAddress = {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type OrderEvent = {
  id: string;
  type:
    | "created"
    | "cancel_requested"
    | "cancelled"
    | "receipt_previewed"
    | "return_requested"
    | "shipping_update_requested"
    | "agentgate_pending_approval"
    | "agentgate_blocked"
    | "agentgate_approved_sync";
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type Order = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  email: string;
  status: "processing" | "shipped" | "delivered" | "cancelled" | "return_requested";
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentLast4?: string;
  eligibleForCancellation: boolean;
  eligibleForReturn: boolean;
  createdThroughCheckout: boolean;
  createdAt: string;
  updatedAt: string;
  agentActions: string[];
  events: OrderEvent[];
  pendingActionRequestId?: string;
  pendingApprovalRequestId?: string;
};

export type Receipt = {
  id: string;
  orderNumber: string;
  email: string;
  sentAt: string;
  previewOnly: boolean;
};

export type AgentLog = {
  id: string;
  timestamp: string;
  sessionId: string;
  customerEmail?: string;
  message: string;
  intent: string;
  action?: string;
  orderNumber?: string;
  decision?: string;
  riskLevel?: string;
  riskScore?: number;
  actionRequestId?: string;
  approvalRequestId?: string;
  result: string;
  status: string;
};

export type AdminConfig = {
  agentGateBaseUrl: string;
  agentGateApiKey?: string;
  agentId: string;
  environment: string;
};

export type StoreData = {
  products: Product[];
  users: StoreUser[];
  sessions: StoreSession[];
  carts: Cart[];
  orders: Order[];
  receipts: Receipt[];
  agentLogs: AgentLog[];
  adminPasswordHash: string;
  nextOrderNumber: number;
  customers?: Customer[];
};

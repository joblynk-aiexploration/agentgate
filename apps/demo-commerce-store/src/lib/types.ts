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

export type Customer = {
  id: string;
  name: string;
  email: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  email: string;
  status: "processing" | "shipped" | "delivered" | "cancelled" | "return_requested";
  total: number;
  items: OrderItem[];
  eligibleForCancellation: boolean;
  eligibleForReturn: boolean;
  createdAt: string;
  agentActions: string[];
};

export type Receipt = {
  id: string;
  orderNumber: string;
  email: string;
  sentAt: string;
};

export type AgentLog = {
  id: string;
  timestamp: string;
  sessionId: string;
  message: string;
  intent: string;
  action?: string;
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
  customers: Customer[];
  orders: Order[];
  receipts: Receipt[];
  agentLogs: AgentLog[];
  adminPasswordHash: string;
};

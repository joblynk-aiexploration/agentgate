import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashSync } from "bcryptjs";
import type {
  AdminConfig,
  AgentLog,
  Cart,
  CartItem,
  Order,
  OrderEvent,
  Product,
  ShippingAddress,
  StoreData,
  StoreSession,
  StoreUser,
} from "@/lib/types";

const dataDir = join(process.cwd(), "data");
const storeFile = join(dataDir, "store.json");
const configFile = join(dataDir, "config.local.json");

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

const defaultAgentGateApiKey =
  process.env.AGENTGATE_DEMO_COMMERCE_API_KEY ??
  "ag_test_seed_demo_commerce_agent_key";
const defaultAgentGateBaseUrl =
  process.env.AGENTGATE_BASE_URL ?? "http://localhost:3001";

export const defaultAdminConfig: AdminConfig = {
  agentGateApiKey: defaultAgentGateApiKey,
  agentGateBaseUrl: defaultAgentGateBaseUrl,
  agentId: "demo-commerce-support-agent",
  environment: "production",
};

const products: Product[] = [
  {
    id: "prod-backpack",
    slug: "summitpro-backpack",
    name: "SummitPro Backpack",
    category: "Backpacks",
    price: 249,
    inventory: 18,
    rating: 4.8,
    reviews: 126,
    image: "linear-gradient(135deg,#0f766e,#134e4a)",
    description: "A 45L technical pack with weatherproof fabric and trail-ready suspension.",
    features: ["45L capacity", "Rain shell pocket", "Hydration sleeve"],
  },
  {
    id: "prod-jacket",
    slug: "alpineshell-jacket",
    name: "AlpineShell Jacket",
    category: "Jackets",
    price: 180,
    inventory: 22,
    rating: 4.7,
    reviews: 89,
    image: "linear-gradient(135deg,#1d4ed8,#172554)",
    description: "Waterproof three-layer shell built for wet shoulder-season hikes.",
    features: ["Waterproof", "Packable hood", "Vent zips"],
  },
  {
    id: "prod-boots",
    slug: "ridgewalk-hiking-boots",
    name: "RidgeWalk Hiking Boots",
    category: "Hiking Boots",
    price: 149,
    inventory: 15,
    rating: 4.6,
    reviews: 73,
    image: "linear-gradient(135deg,#92400e,#451a03)",
    description: "Stable mid-height hiking boots for gravel, mud, and weekend climbs.",
    features: ["Vibram-style sole", "Water-resistant upper", "Ankle support"],
  },
  {
    id: "prod-bottle",
    slug: "traillite-water-bottle",
    name: "TrailLite Water Bottle",
    category: "Water Bottles",
    price: 39.99,
    inventory: 64,
    rating: 4.9,
    reviews: 211,
    image: "linear-gradient(135deg,#0891b2,#155e75)",
    description: "Insulated stainless bottle that keeps drinks cold through long trail days.",
    features: ["24 oz", "Leakproof cap", "Dishwasher safe"],
  },
  {
    id: "prod-tent",
    slug: "trailnest-tent",
    name: "TrailNest Tent",
    category: "Tents",
    price: 229,
    inventory: 9,
    rating: 4.5,
    reviews: 58,
    image: "linear-gradient(135deg,#15803d,#14532d)",
    description: "Two-person freestanding tent with quick setup and roomy vestibules.",
    features: ["2-person", "4 lb 3 oz", "Double vestibule"],
  },
  {
    id: "prod-light",
    slug: "camplight-mini",
    name: "CampLight Mini",
    category: "Camping Lights",
    price: 49.99,
    inventory: 37,
    rating: 4.6,
    reviews: 104,
    image: "linear-gradient(135deg,#f59e0b,#854d0e)",
    description: "USB-C rechargeable camp light with lantern, torch, and red-light modes.",
    features: ["USB-C", "Red-light mode", "Magnetic base"],
  },
  {
    id: "prod-gloves",
    slug: "stormgrip-gloves",
    name: "StormGrip Gloves",
    category: "Gloves",
    price: 59,
    inventory: 41,
    rating: 4.4,
    reviews: 47,
    image: "linear-gradient(135deg,#334155,#020617)",
    description: "Warm, grippy gloves for cold trail starts and camp chores.",
    features: ["Touchscreen tips", "Fleece lined", "Water resistant"],
  },
  {
    id: "prod-organizer",
    slug: "waypoint-travel-organizer",
    name: "Waypoint Travel Organizer",
    category: "Travel Organizers",
    price: 34,
    inventory: 52,
    rating: 4.7,
    reviews: 66,
    image: "linear-gradient(135deg,#7c3aed,#312e81)",
    description: "Compact organizer for cables, passports, trail permits, and small essentials.",
    features: ["Zippered dividers", "Passport sleeve", "Recycled nylon"],
  },
];

function seedUsers(createdAt: string): StoreUser[] {
  return [
    {
      id: "user-customer-sarah",
      name: "Sarah Miller",
      email: "customer@northstar-demo.dev",
      passwordHash: hashSync("Password123!", 12),
      role: "customer",
      createdAt,
    },
    {
      id: "user-admin",
      name: "Admin User",
      email: "admin@northstar-demo.dev",
      passwordHash: hashSync("Password123!", 12),
      role: "admin",
      createdAt,
    },
  ];
}

function seedData(): StoreData {
  const createdAt = now();

  return {
    products,
    users: seedUsers(createdAt),
    sessions: [],
    carts: [],
    orders: [],
    receipts: [],
    agentLogs: [],
    adminPasswordHash: hashSync("Password123!", 12),
    nextOrderNumber: 2001,
  };
}

function legacyEventTitle(type: string) {
  const labels: Record<string, string> = {
    agentgate_approved_sync: "AgentGate approval executed",
    agentgate_blocked: "Action blocked by AgentGate",
    agentgate_pending_approval: "Approval required",
    cancel_requested: "Cancellation requested",
    cancelled: "Order cancelled",
    created: "Order placed",
    receipt_previewed: "Receipt previewed",
    return_requested: "Return requested",
    shipping_update_requested: "Shipping update requested",
  };

  return labels[type] ?? titleFromEventType(type);
}

function titleFromEventType(type: string) {
  return type
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function inferEventActor(type: string): NonNullable<OrderEvent["actorType"]> {
  if (type.includes("agentgate")) {
    return "agentgate";
  }

  if (type.includes("admin")) {
    return "admin";
  }

  if (type.includes("receipt") || type.includes("cancel") || type.includes("return")) {
    return "agent";
  }

  return "system";
}

function normalizeOrderEvent(order: Pick<Order, "number">, event: OrderEvent): OrderEvent {
  const type = event.type;

  return {
    ...event,
    actorLabel: event.actorLabel ?? titleFromEventType(event.actorType ?? inferEventActor(type)),
    actorType: event.actorType ?? inferEventActor(type),
    description: event.description ?? event.message,
    orderNumber: event.orderNumber ?? order.number,
    title: event.title ?? legacyEventTitle(type),
    visibleToCustomer: event.visibleToCustomer ?? !type.includes("admin"),
  };
}

function ensureDataDir() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

function migrateStore(data: Partial<StoreData>): StoreData {
  const users = data.users?.length ? data.users : seedUsers(now());
  const orders = (data.orders ?? []).map((order) => {
    const migrated = order as Order;
    const subtotal = migrated.subtotal ?? migrated.total ?? 0;
    const shipping = migrated.shipping ?? (subtotal >= 100 ? 0 : 9.95);
    const tax = migrated.tax ?? Math.round(subtotal * 0.0825 * 100) / 100;

    return {
      ...migrated,
      subtotal,
      shipping,
      tax,
      total: migrated.total ?? Math.round((subtotal + shipping + tax) * 100) / 100,
      shippingAddress:
        migrated.shippingAddress ??
        ({
          fullName: migrated.customerName,
          addressLine1: "Demo address",
          city: "Austin",
          state: "TX",
          zip: "78701",
          country: "US",
        } satisfies ShippingAddress),
      createdThroughCheckout: migrated.createdThroughCheckout ?? false,
      updatedAt: migrated.updatedAt ?? migrated.createdAt ?? now(),
      agentActions: migrated.agentActions ?? [],
      events: (migrated.events ?? []).map((event) =>
        normalizeOrderEvent(migrated, event),
      ),
    };
  });

  return {
    products: data.products?.length ? data.products : products,
    users,
    sessions: data.sessions ?? [],
    carts: data.carts ?? [],
    orders,
    receipts: data.receipts ?? [],
    agentLogs: data.agentLogs ?? [],
    adminPasswordHash: data.adminPasswordHash ?? users.find((user) => user.role === "admin")?.passwordHash ?? hashSync("Password123!", 12),
    nextOrderNumber: data.nextOrderNumber ?? 2001,
  };
}

export function resetStore() {
  ensureDataDir();
  writeFileSync(storeFile, JSON.stringify(seedData(), null, 2));
  writeFileSync(configFile, JSON.stringify(defaultAdminConfig, null, 2));
}

export function readStore(): StoreData {
  ensureDataDir();

  if (!existsSync(storeFile)) {
    resetStore();
  }

  const parsed = JSON.parse(readFileSync(storeFile, "utf8")) as Partial<StoreData>;
  const migrated = migrateStore(parsed);

  if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
    writeStore(migrated);
  }

  return migrated;
}

export function writeStore(data: StoreData) {
  ensureDataDir();
  writeFileSync(storeFile, JSON.stringify(data, null, 2));
}

export function readAdminConfig(): AdminConfig {
  ensureDataDir();

  if (!existsSync(configFile)) {
    writeFileSync(configFile, JSON.stringify(defaultAdminConfig, null, 2));
  }

  return { ...defaultAdminConfig, ...(JSON.parse(readFileSync(configFile, "utf8")) as AdminConfig) };
}

export function writeAdminConfig(config: AdminConfig) {
  ensureDataDir();
  writeFileSync(configFile, JSON.stringify(config, null, 2));
}

export function safeAdminConfig(config = readAdminConfig()) {
  return {
    agentGateBaseUrl: config.agentGateBaseUrl,
    agentId: config.agentId,
    environment: config.environment,
    keyConfigured: Boolean(config.agentGateApiKey),
    keyPrefix: config.agentGateApiKey ? config.agentGateApiKey.slice(0, 17) : null,
  };
}

export function findUserByEmail(email: string) {
  const store = readStore();
  return store.users.find((user) => user.email === normalizedEmail(email));
}

export function findUserById(userId: string) {
  const store = readStore();
  return store.users.find((user) => user.id === userId);
}

export function createCustomerUser(input: { name: string; email: string; passwordHash: string }) {
  const store = readStore();
  const email = normalizedEmail(input.email);
  const existing = store.users.find((user) => user.email === email);

  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const user: StoreUser = {
    id: id("user"),
    name: input.name.trim(),
    email,
    passwordHash: input.passwordHash,
    role: "customer",
    createdAt: now(),
  };
  store.users = [user, ...store.users];
  writeStore(store);

  return user;
}

export function createSession(userId: string, role: StoreSession["role"]) {
  const store = readStore();
  const session: StoreSession = {
    id: id("sess"),
    userId,
    role,
    createdAt: now(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  };

  store.sessions = [session, ...store.sessions.filter((item) => item.userId !== userId || item.role !== role)];
  writeStore(store);

  return session;
}

export function deleteSession(sessionId: string) {
  const store = readStore();
  store.sessions = store.sessions.filter((session) => session.id !== sessionId);
  writeStore(store);
}

export function findValidSession(sessionId: string | undefined, role?: StoreSession["role"]) {
  if (!sessionId) {
    return null;
  }

  const store = readStore();
  const session = store.sessions.find((item) => item.id === sessionId && (!role || item.role === role));

  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    if (session) {
      deleteSession(session.id);
    }
    return null;
  }

  return session;
}

export function getCart(owner: { userId?: string; cartId?: string }) {
  const store = readStore();

  if (owner.userId) {
    return store.carts.find((cart) => cart.userId === owner.userId) ?? null;
  }

  if (owner.cartId) {
    return store.carts.find((cart) => cart.id === owner.cartId) ?? null;
  }

  return null;
}

export function getOrCreateCart(owner: { userId?: string; cartId?: string }) {
  const store = readStore();
  const existing = owner.userId
    ? store.carts.find((cart) => cart.userId === owner.userId)
    : owner.cartId
      ? store.carts.find((cart) => cart.id === owner.cartId)
      : null;

  if (existing) {
    return existing;
  }

  const cart: Cart = {
    id: owner.cartId ?? id("cart"),
    userId: owner.userId,
    sessionId: owner.userId ? undefined : owner.cartId,
    items: [],
    createdAt: now(),
    updatedAt: now(),
  };
  store.carts = [cart, ...store.carts];
  writeStore(store);

  return cart;
}

export function mergeAnonymousCartIntoUserCart(cartId: string | undefined, userId: string) {
  if (!cartId) {
    return getOrCreateCart({ userId });
  }

  const store = readStore();
  const anonymous = store.carts.find((cart) => cart.id === cartId);
  const userCart = store.carts.find((cart) => cart.userId === userId) ?? {
    id: id("cart"),
    userId,
    items: [],
    createdAt: now(),
    updatedAt: now(),
  };

  if (anonymous) {
    for (const item of anonymous.items) {
      const existing = userCart.items.find((cartItem) => cartItem.productId === item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        userCart.items.push({ ...item });
      }
    }
  }

  userCart.updatedAt = now();
  store.carts = [
    userCart,
    ...store.carts.filter((cart) => cart.id !== anonymous?.id && cart.id !== userCart.id),
  ];
  writeStore(store);

  return userCart;
}

export function addCartItem(owner: { userId?: string; cartId?: string }, productId: string, quantity: number) {
  const store = readStore();
  const product = store.products.find((item) => item.id === productId);

  if (!product) {
    throw new Error("Product not found.");
  }

  const cart = getOrCreateCart(owner);
  const item = cart.items.find((cartItem) => cartItem.productId === productId);
  const nextQuantity = Math.max(1, Math.min(product.inventory, quantity));

  if (item) {
    item.quantity = Math.min(product.inventory, item.quantity + nextQuantity);
  } else {
    cart.items.push({ productId, quantity: nextQuantity });
  }

  cart.updatedAt = now();
  saveCart(cart);

  return cart;
}

export function updateCartItem(owner: { userId?: string; cartId?: string }, productId: string, quantity: number) {
  const cart = getCart(owner);

  if (!cart) {
    return null;
  }

  if (quantity <= 0) {
    cart.items = cart.items.filter((item) => item.productId !== productId);
  } else {
    const product = readStore().products.find((item) => item.id === productId);
    const item = cart.items.find((cartItem) => cartItem.productId === productId);
    if (item && product) {
      item.quantity = Math.min(product.inventory, quantity);
    }
  }

  cart.updatedAt = now();
  saveCart(cart);

  return cart;
}

export function clearCart(owner: { userId?: string; cartId?: string }) {
  const cart = getCart(owner);
  if (!cart) {
    return;
  }

  cart.items = [];
  cart.updatedAt = now();
  saveCart(cart);
}

function saveCart(cart: Cart) {
  const store = readStore();
  store.carts = [cart, ...store.carts.filter((item) => item.id !== cart.id)];
  writeStore(store);
}

export function hydrateCart(cart: Cart | null) {
  const store = readStore();
  const items = (cart?.items ?? [])
    .map((item) => {
      const product = store.products.find((productItem) => productItem.id === item.productId);
      if (!product) {
        return null;
      }
      return {
        ...item,
        product,
        lineTotal: Math.round(product.price * item.quantity * 100) / 100,
      };
    })
    .filter((item): item is CartItem & { product: Product; lineTotal: number } => Boolean(item));
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const shipping = subtotal > 0 && subtotal < 100 ? 9.95 : 0;
  const tax = Math.round(subtotal * 0.0825 * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  return { items, subtotal, shipping, tax, total, count: items.reduce((sum, item) => sum + item.quantity, 0) };
}

export function nextOrderNumber(store: StoreData) {
  const number = `NS-${store.nextOrderNumber}`;
  store.nextOrderNumber += 1;
  return number;
}

export function createCheckoutOrder(input: {
  userId: string;
  shippingAddress: ShippingAddress;
  paymentLast4?: string;
}) {
  const store = readStore();
  const user = store.users.find((item) => item.id === input.userId && item.role === "customer");
  const cart = store.carts.find((item) => item.userId === input.userId);
  const summary = hydrateCart(cart ?? null);

  if (!user) {
    throw new Error("Customer account not found.");
  }

  if (!summary.items.length) {
    throw new Error("Cannot checkout an empty cart.");
  }

  const createdAt = now();
  const order: Order = {
    id: id("ord"),
    number: nextOrderNumber(store),
    customerId: user.id,
    customerName: user.name,
    email: user.email,
    status: "processing",
    subtotal: summary.subtotal,
    shipping: summary.shipping,
    tax: summary.tax,
    total: summary.total,
    items: summary.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    })),
    shippingAddress: input.shippingAddress,
    paymentLast4: input.paymentLast4,
    eligibleForCancellation: true,
    eligibleForReturn: false,
    createdThroughCheckout: true,
    createdAt,
    updatedAt: createdAt,
    agentActions: [],
    events: [
      {
        id: id("evt"),
        type: "order.created",
        title: "Order placed",
        message: "Customer created this local demo order through checkout.",
        description: "The customer completed local demo checkout. No real payment provider was contacted.",
        actorType: "customer",
        actorLabel: user.name,
        orderNumber: "",
        visibleToCustomer: true,
        createdAt,
      },
      {
        id: id("evt"),
        type: "payment.authorized_demo",
        title: "Demo payment authorized",
        message: "Demo card authorization was recorded locally.",
        description: "No real card charge was made. This is a local checkout simulation.",
        actorType: "system",
        actorLabel: "Northstar checkout",
        orderNumber: "",
        visibleToCustomer: true,
        createdAt,
      },
      {
        id: id("evt"),
        type: "fulfillment.queued",
        title: "Fulfillment queued",
        message: "The local order entered the fulfillment queue.",
        description: "Northstar admin can move this order through packed, shipped, and delivered demo statuses.",
        actorType: "system",
        actorLabel: "Fulfillment system",
        orderNumber: "",
        visibleToCustomer: true,
        createdAt,
      },
    ].map((event) => normalizeOrderEvent({ number: "" }, event as OrderEvent)),
  };

  order.events = order.events.map((event) => ({ ...event, orderNumber: order.number }));

  store.orders = [order, ...store.orders];
  store.receipts = [
    {
      id: id("receipt"),
      orderNumber: order.number,
      email: order.email,
      sentAt: createdAt,
      previewOnly: true,
    },
    ...store.receipts,
  ];
  store.carts = store.carts.map((item) => (item.id === cart?.id ? { ...item, items: [], updatedAt: createdAt } : item));
  writeStore(store);

  return order;
}

export function findOrder(orderNumber: string, email: string) {
  const store = readStore();

  return store.orders.find(
    (order) =>
      order.number.toLowerCase() === orderNumber.toLowerCase() &&
      order.email.toLowerCase() === normalizedEmail(email),
  );
}

export function findOrderForCustomer(orderNumber: string, customerId: string) {
  const store = readStore();

  return store.orders.find(
    (order) => order.number.toLowerCase() === orderNumber.toLowerCase() && order.customerId === customerId,
  );
}

export function findLatestOrderForCustomer(customerId: string) {
  const store = readStore();

  return [...store.orders]
    .filter((order) => order.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function listOrdersForCustomer(customerId: string) {
  return readStore()
    .orders.filter((order) => order.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateOrder(updated: Order) {
  const store = readStore();
  store.orders = store.orders.map((order) =>
    order.id === updated.id ? { ...updated, updatedAt: now() } : order,
  );
  writeStore(store);
}

export function addOrderEvent(order: Order, event: Omit<OrderEvent, "id" | "createdAt">) {
  const updated: Order = {
    ...order,
    events: [
      normalizeOrderEvent(order, {
        id: id("evt"),
        createdAt: now(),
        ...event,
      }),
      ...(order.events ?? []),
    ],
  };
  updateOrder(updated);
  return updated;
}

export function addAgentLog(log: AgentLog) {
  const store = readStore();
  store.agentLogs = [log, ...store.agentLogs].slice(0, 200);
  writeStore(store);
}

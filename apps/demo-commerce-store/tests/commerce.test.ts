import { compareSync, hashSync } from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "../src/lib/format";
import {
  addCartItem,
  createCheckoutOrder,
  createCustomerUser,
  defaultAdminConfig,
  findLatestOrderForCustomer,
  hydrateCart,
  readAdminConfig,
  readStore,
  resetStore,
  safeAdminConfig,
  writeAdminConfig,
} from "../src/lib/store";
import { routeIntent } from "../src/server/agent/intent-router";
import { cancelOrder, deleteCustomerData, resendReceipt } from "../src/server/agent/order-tools";
import { answerOrderStatus, answerProductQuestion } from "../src/server/agent/store-knowledge";

function createSarahOrder() {
  const sarah = readStore().users.find((user) => user.email === "customer@northstar-demo.dev");
  expect(sarah).toBeTruthy();

  addCartItem({ userId: sarah!.id }, "prod-backpack", 1);
  addCartItem({ userId: sarah!.id }, "prod-jacket", 1);

  return createCheckoutOrder({
    userId: sarah!.id,
    paymentLast4: "4242",
    shippingAddress: {
      fullName: "Sarah Miller",
      addressLine1: "120 Trail Ridge Road",
      city: "Austin",
      state: "TX",
      zip: "78701",
      country: "US",
    },
  });
}

function mockAgentGate(decision: "ALLOW" | "LOG_ONLY" | "REQUIRE_APPROVAL" | "BLOCK") {
  const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { action?: string };
    return new Response(
      JSON.stringify({
        actionRequestId: `act-${body.action ?? "unknown"}`,
        approvalRequestId: decision === "REQUIRE_APPROVAL" ? "apr-demo" : undefined,
        decision,
        reason: decision === "BLOCK" ? "Demo policy blocked this action." : "Demo policy reviewed this action.",
        risk: {
          explanation: "Deterministic local demo risk review.",
          level: decision === "BLOCK" ? "CRITICAL" : "HIGH",
          score: decision === "BLOCK" ? 95 : 72,
          signals: ["demo_commerce"],
        },
        status: decision === "REQUIRE_APPROVAL" ? "PENDING_APPROVAL" : decision === "BLOCK" ? "BLOCKED" : "ALLOWED",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  vi.stubGlobal("fetch", fetchMock);
  writeAdminConfig({
    ...defaultAdminConfig,
    agentGateApiKey: "ag_test_seed_demo_commerce_agent_key",
  });

  return fetchMock;
}

describe("Northstar demo store", () => {
  beforeEach(() => {
    resetStore();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetStore();
  });

  it("seeds customer and admin users without active customer orders", () => {
    const store = readStore();

    expect(store.products.map((product) => product.name)).toContain("SummitPro Backpack");
    expect(store.users.find((user) => user.email === "customer@northstar-demo.dev")?.role).toBe("customer");
    expect(store.users.find((user) => user.email === "admin@northstar-demo.dev")?.role).toBe("admin");
    expect(store.orders).toHaveLength(0);
  });

  it("resets with the local demo AgentGate config already available server-side", () => {
    const config = readAdminConfig();
    const safe = safeAdminConfig(config);

    expect(config.agentGateApiKey).toBe("ag_test_seed_demo_commerce_agent_key");
    expect(config.agentId).toBe("demo-commerce-support-agent");
    expect(config.agentGateBaseUrl).toBe("http://localhost:3001");
    expect(safe.keyConfigured).toBe(true);
    expect(JSON.stringify(safe)).not.toContain("commerce_agent_key");
    expect(safe.keyPrefix).toBe("ag_test_seed_demo");
  });

  it("registers a customer with a bcrypt hash", () => {
    const user = createCustomerUser({
      email: "new-customer@northstar-demo.dev",
      name: "New Customer",
      passwordHash: hashSync("Password123!", 12),
    });

    expect(user.passwordHash).not.toBe("Password123!");
    expect(compareSync("Password123!", user.passwordHash)).toBe(true);
  });

  it("adds, updates, and hydrates cart items", () => {
    const sarah = readStore().users.find((user) => user.email === "customer@northstar-demo.dev")!;
    const cart = addCartItem({ userId: sarah.id }, "prod-backpack", 2);
    const summary = hydrateCart(cart);

    expect(summary.count).toBe(2);
    expect(summary.subtotal).toBe(498);
    expect(formatCurrency(summary.total)).toContain("$");
  });

  it("checkout creates a local order and empties the cart", () => {
    const order = createSarahOrder();
    const sarah = readStore().users.find((user) => user.email === "customer@northstar-demo.dev")!;
    const latest = findLatestOrderForCustomer(sarah.id);
    const cartSummary = hydrateCart(readStore().carts.find((cart) => cart.userId === sarah.id) ?? null);

    expect(order.number).toBe("NS-2001");
    expect(order.email).toBe("customer@northstar-demo.dev");
    expect(order.createdThroughCheckout).toBe(true);
    expect(order.status).toBe("processing");
    expect(latest?.number).toBe(order.number);
    expect(cartSummary.count).toBe(0);
  });

  it("routes latest-order and customer action intents", () => {
    expect(routeIntent("Cancel my latest order.")).toMatchObject({
      intent: "cancel_order",
      latestOrder: true,
    });
    expect(routeIntent("Can you resend my receipt for NS-2001 to customer@northstar-demo.dev?")).toMatchObject({
      email: "customer@northstar-demo.dev",
      intent: "resend_receipt",
      orderNumber: "NS-2001",
    });
  });

  it("answers product questions from local store knowledge", () => {
    const answer = answerProductQuestion({
      intent: "product_question",
      query: "Do you have waterproof jackets?",
    });

    expect(answer).toContain("AlpineShell Jacket");
  });

  it("cannot find order-specific data before checkout", () => {
    const sarah = readStore().users.find((user) => user.email === "customer@northstar-demo.dev")!;
    const answer = answerOrderStatus(
      { intent: "order_status", latestOrder: true, query: "Where is my latest order?" },
      { id: sarah.id, email: sarah.email },
    );

    expect(answer).toContain("could not find");
  });

  it("finds logged-in customer order data after checkout", () => {
    const order = createSarahOrder();
    const answer = answerOrderStatus(
      { intent: "order_status", latestOrder: true, query: "Where is my latest order?" },
      { id: order.customerId, email: order.email },
    );

    expect(answer).toContain(order.number);
    expect(answer).toContain("SummitPro Backpack");
  });

  it("cancel latest order calls AgentGate and stores pending approval", async () => {
    const order = createSarahOrder();
    const fetchMock = mockAgentGate("REQUIRE_APPROVAL");
    const result = await cancelOrder(
      { intent: "cancel_order", latestOrder: true, query: "Cancel my latest order." },
      { id: order.customerId, email: order.email, name: order.customerName },
    );
    const updated = findLatestOrderForCustomer(order.customerId);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.status).toBe("pending_approval");
    expect(result.agentGateDecision?.decision).toBe("REQUIRE_APPROVAL");
    expect(updated?.status).toBe("processing");
    expect(updated?.pendingApprovalRequestId).toBe("apr-demo");
  });

  it("receipt resend calls AgentGate and simulates only after allow/log", async () => {
    const order = createSarahOrder();
    const fetchMock = mockAgentGate("LOG_ONLY");
    const result = await resendReceipt(
      { intent: "resend_receipt", latestOrder: true, query: "Resend my receipt." },
      { id: order.customerId, email: order.email, name: order.customerName },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.status).toBe("completed");
    expect(readStore().receipts.filter((receipt) => receipt.orderNumber === order.number)).toHaveLength(2);
  });

  it("delete customer action is blocked/refused and does not remove the user", async () => {
    const fetchMock = mockAgentGate("BLOCK");
    const result = await deleteCustomerData("customer@northstar-demo.dev");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.status).toBe("blocked");
    expect(readStore().users.find((user) => user.email === "customer@northstar-demo.dev")).toBeTruthy();
  });

  it("stores the AgentGate key server-side and exposes only a prefix", () => {
    writeAdminConfig({
      ...defaultAdminConfig,
      agentGateApiKey: "ag_test_seed_demo_commerce_agent_key",
    });

    expect(readAdminConfig().agentGateApiKey).toBe("ag_test_seed_demo_commerce_agent_key");
    expect(JSON.stringify(safeAdminConfig())).not.toContain("commerce_agent_key");
    expect(safeAdminConfig().keyPrefix).toBe("ag_test_seed_demo");
  });
});

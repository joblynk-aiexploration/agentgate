import { afterEach, describe, expect, it } from "vitest";
import { routeIntent } from "../src/server/agent/intent-router";
import { answerProductQuestion } from "../src/server/agent/store-knowledge";
import {
  defaultAdminConfig,
  readAdminConfig,
  readStore,
  resetStore,
  safeAdminConfig,
  writeAdminConfig,
} from "../src/lib/store";

describe("Northstar demo store", () => {
  afterEach(() => {
    resetStore();
  });

  it("seeds realistic products and orders", () => {
    resetStore();
    const store = readStore();

    expect(store.products.map((product) => product.name)).toContain("SummitPro Backpack");
    expect(store.orders.find((order) => order.number === "NS-1002")?.total).toBe(429);
    expect(store.orders.find((order) => order.number === "NS-1003")?.status).toBe("shipped");
  });

  it("routes customer cancellation and receipt intents", () => {
    expect(routeIntent("Cancel my order NS-1002. My email is sarah@example.com.")).toMatchObject({
      email: "sarah@example.com",
      intent: "cancel_order",
      orderNumber: "NS-1002",
    });
    expect(routeIntent("Can you resend my receipt for NS-1001 to sarah@example.com?")).toMatchObject({
      intent: "resend_receipt",
      orderNumber: "NS-1001",
    });
  });

  it("answers product questions from local store knowledge", () => {
    resetStore();
    const answer = answerProductQuestion({
      intent: "product_question",
      query: "Do you have waterproof jackets?",
    });

    expect(answer).toContain("AlpineShell Jacket");
  });

  it("stores the AgentGate key server-side and exposes only a prefix", () => {
    resetStore();
    writeAdminConfig({
      ...defaultAdminConfig,
      agentGateApiKey: "ag_test_seed_demo_commerce_agent_key",
    });

    expect(readAdminConfig().agentGateApiKey).toBe("ag_test_seed_demo_commerce_agent_key");
    expect(JSON.stringify(safeAdminConfig())).not.toContain("commerce_agent_key");
    expect(safeAdminConfig().keyPrefix).toBe("ag_test_seed_demo");
  });
});

import { describe, expect, it } from "vitest";
import {
  createGatewayCheckFingerprint,
  getStoredIdempotencyFingerprint,
  metadataWithIdempotencyFingerprint,
} from "@/server/gateway/idempotency";
import { ToolType } from "@/generated/prisma/client";

const baseRequest = {
  action: "refund.create",
  agentId: "support-refund-agent",
  amount: 1200,
  currency: "USD",
  dataSensitivity: null,
  environment: "production",
  externalCommunication: null,
  metadata: {
    customerTier: "business",
    source: "test",
  },
  payload: {
    customerId: "cus_demo",
    reason: "duplicate_charge",
  },
  productionEnvironment: null,
  reason: "Customer was double charged",
  reversible: false,
  tool: ToolType.STRIPE,
};

describe("gateway idempotency fingerprints", () => {
  it("creates the same fingerprint for equivalent object key ordering", () => {
    const first = createGatewayCheckFingerprint(baseRequest);
    const second = createGatewayCheckFingerprint({
      ...baseRequest,
      metadata: {
        source: "test",
        customerTier: "business",
      },
      payload: {
        reason: "duplicate_charge",
        customerId: "cus_demo",
      },
    });

    expect(second).toBe(first);
  });

  it("changes the fingerprint when the gateway request changes", () => {
    const first = createGatewayCheckFingerprint(baseRequest);
    const second = createGatewayCheckFingerprint({
      ...baseRequest,
      amount: 50,
    });

    expect(second).not.toBe(first);
  });

  it("stores and reads the fingerprint without replacing caller metadata", () => {
    const metadata = metadataWithIdempotencyFingerprint(
      { source: "test" },
      "fingerprint_123",
    );

    expect(metadata).toMatchObject({ source: "test" });
    expect(getStoredIdempotencyFingerprint(metadata)).toBe("fingerprint_123");
  });
});

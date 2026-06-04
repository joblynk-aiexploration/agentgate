import { describe, expect, it, beforeEach } from "vitest";
import {
  generateApiKeyMaterial,
  hashApiKey,
} from "@/lib/crypto";

describe("API key material", () => {
  beforeEach(() => {
    process.env.API_KEY_PEPPER = "test-api-key-pepper";
  });

  it("generates keys with the V1 test prefix", () => {
    const material = generateApiKeyMaterial();

    expect(material.fullKey).toMatch(/^ag_test_/);
  });

  it("hashes the same key deterministically", () => {
    const key = "ag_test_known_secret";

    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("does not need a full key in the stored record", () => {
    const material = generateApiKeyMaterial();
    const storedRecord = {
      keyHash: material.keyHash,
      keyPrefix: material.keyPrefix,
    };

    expect(storedRecord).not.toHaveProperty("fullKey");
    expect(storedRecord.keyHash).not.toBe(material.fullKey);
    expect(storedRecord.keyHash).not.toContain(material.fullKey);
  });

  it("extracts a display prefix from the generated full key", () => {
    const material = generateApiKeyMaterial();

    expect(material.keyPrefix).toBe(material.fullKey.slice(0, 18));
    expect(material.keyPrefix).toMatch(/^ag_test_/);
  });
});

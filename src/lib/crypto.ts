import { createHmac, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const API_KEY_PREFIX = "ag_test_";

function getApiKeyPepper() {
  return env.API_KEY_PEPPER;
}

export function hashApiKey(apiKey: string) {
  return createHmac("sha256", getApiKeyPepper())
    .update(apiKey)
    .digest("hex");
}

export function generateApiKeyMaterial() {
  const secret = randomBytes(32).toString("base64url");
  const fullKey = `${API_KEY_PREFIX}${secret}`;

  return {
    fullKey,
    keyHash: hashApiKey(fullKey),
    keyPrefix: fullKey.slice(0, 18),
  };
}

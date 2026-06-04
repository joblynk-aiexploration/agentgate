import { createHmac, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "ag_test_";

function getApiKeyPepper() {
  const pepper = process.env.API_KEY_PEPPER;

  if (!pepper) {
    throw new Error("API_KEY_PEPPER is required for API key hashing.");
  }

  return pepper;
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

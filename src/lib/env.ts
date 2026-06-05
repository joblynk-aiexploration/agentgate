import { z } from "zod";

const placeholderValues = new Set([
  "replace-with-a-long-random-secret",
  "replace-with-32-byte-key",
  "agentgate-development-seed-pepper",
]);

const warned = new Set<string>();

const buildOnlyFallbacks = {
  API_KEY_PEPPER: "agentgate-build-api-key-pepper-not-for-runtime",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/agentgate",
  ENCRYPTION_KEY: "agentgate-build-encryption-key-not-for-runtime",
  SESSION_SECRET: "agentgate-build-session-secret-not-for-runtime",
} satisfies Record<string, string>;

const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .catch("development");

const requiredStringSchema = z.string().trim().min(1);
const urlSchema = z.string().trim().url();

function nodeEnv() {
  return nodeEnvSchema.parse(process.env.NODE_ENV);
}

function warnOnce(key: string, message: string) {
  if (warned.has(key)) {
    return;
  }

  warned.add(key);
  console.warn(message);
}

function isProduction() {
  return nodeEnv() === "production";
}

function isValidationSkippedForBuild() {
  return process.env.AGENTGATE_SKIP_ENV_VALIDATION === "1";
}

function readBuildOnlyFallback(name: keyof typeof buildOnlyFallbacks) {
  warnOnce(
    "AGENTGATE_SKIP_ENV_VALIDATION",
    "Environment validation is skipped for an image build. Runtime environment variables are still required.",
  );

  return buildOnlyFallbacks[name];
}

function parseRequired(name: string, schema: z.ZodType<string>, value: unknown) {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`${name} is required and must be valid.`);
  }

  return parsed.data;
}

function readRequiredEnv(
  name: keyof typeof buildOnlyFallbacks,
  schema: z.ZodType<string> = requiredStringSchema,
) {
  const value =
    process.env[name] ??
    (isValidationSkippedForBuild() ? readBuildOnlyFallback(name) : undefined);

  return parseRequired(name, schema, value);
}

function readSecretEnv(name: "SESSION_SECRET" | "API_KEY_PEPPER" | "ENCRYPTION_KEY") {
  const value = readRequiredEnv(name);

  if (isProduction() && placeholderValues.has(value)) {
    throw new Error(`${name} must not use a default placeholder in production.`);
  }

  if (!isProduction() && placeholderValues.has(value)) {
    warnOnce(
      name,
      `${name} is using a development placeholder. Replace it before production. Secret value was not printed.`,
    );
  }

  return value;
}

function readAppUrl() {
  const value = process.env.APP_URL;

  if (!value && isValidationSkippedForBuild()) {
    return readBuildOnlyFallback("APP_URL");
  }

  if (!value && !isProduction()) {
    warnOnce(
      "APP_URL",
      "APP_URL is not set. Falling back to http://localhost:3000 for development.",
    );

    return "http://localhost:3000";
  }

  return parseRequired("APP_URL", urlSchema, value);
}

export const env = {
  get API_KEY_PEPPER() {
    return readSecretEnv("API_KEY_PEPPER");
  },
  get APP_URL() {
    return readAppUrl();
  },
  get DATABASE_URL() {
    return readRequiredEnv("DATABASE_URL", urlSchema);
  },
  get ENCRYPTION_KEY() {
    return readSecretEnv("ENCRYPTION_KEY");
  },
  get NODE_ENV() {
    return nodeEnv();
  },
  get SESSION_SECRET() {
    return readSecretEnv("SESSION_SECRET");
  },
};

export function validateEnv() {
  return {
    API_KEY_PEPPER: env.API_KEY_PEPPER,
    APP_URL: env.APP_URL,
    DATABASE_URL: env.DATABASE_URL,
    ENCRYPTION_KEY: env.ENCRYPTION_KEY,
    NODE_ENV: env.NODE_ENV,
    SESSION_SECRET: env.SESSION_SECRET,
  };
}

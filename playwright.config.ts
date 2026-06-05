import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- -p 3100 -H 127.0.0.1",
    env: {
      AGENTGATE_SKIP_ENV_VALIDATION: "1",
      API_KEY_PEPPER:
        process.env.API_KEY_PEPPER ?? "agentgate-e2e-api-key-pepper-not-for-runtime",
      APP_URL: process.env.APP_URL ?? "http://127.0.0.1:3100",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/agentgate",
      ENCRYPTION_KEY:
        process.env.ENCRYPTION_KEY ??
        "agentgate-e2e-encryption-key-not-for-runtime",
      SESSION_SECRET:
        process.env.SESSION_SECRET ??
        "agentgate-e2e-session-secret-not-for-runtime",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://127.0.0.1:3100",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

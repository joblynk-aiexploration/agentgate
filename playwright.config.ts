import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const webServerURL = process.env.PLAYWRIGHT_WEBSERVER_URL ?? baseURL;
const webServerHost = new URL(webServerURL).hostname;
const webServerPort = new URL(webServerURL).port || "3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- -p ${webServerPort} -H ${webServerHost}`,
    env: {
      AGENTGATE_SKIP_ENV_VALIDATION: "1",
      API_KEY_PEPPER:
        process.env.API_KEY_PEPPER ?? "agentgate-e2e-api-key-pepper-not-for-runtime",
      APP_URL: process.env.APP_URL ?? webServerURL,
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
    url: webServerURL,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

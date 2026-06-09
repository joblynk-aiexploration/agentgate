import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

const accounts = [
  {
    email: "owner@agentgate.dev",
    label: "Owner",
    pages: ["/dashboard", "/agents", "/policies", "/approvals", "/audit-logs", "/settings"],
  },
  {
    email: "security@agentgate.dev",
    label: "Security admin",
    pages: ["/dashboard", "/agents", "/policies", "/approvals", "/audit-logs", "/settings"],
  },
  {
    email: "developer@agentgate.dev",
    label: "Developer",
    pages: ["/dashboard", "/agents", "/developer", "/developer/api-keys", "/developer/docs"],
  },
  {
    email: "reviewer@agentgate.dev",
    label: "Reviewer",
    pages: ["/dashboard", "/approvals", "/audit-logs", "/integrations/demo-commerce"],
  },
  {
    email: "auditor@agentgate.dev",
    label: "Auditor",
    pages: ["/dashboard", "/audit-logs", "/reports", "/approvals"],
  },
  {
    email: "platform@agentgate.dev",
    label: "Platform owner",
    pages: ["/platform", "/platform/organizations", "/platform/health", "/platform/audit"],
  },
] as const;

async function seededDemoAvailable(request: APIRequestContext) {
  const response = await request.get("/api/demo/status").catch(() => null);

  if (!response?.ok()) {
    return false;
  }

  const body = (await response.json()) as { ok?: boolean };

  return body.ok === true;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.locator("body")).not.toContainText("Workspace error");
  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
}

async function logout(page: Page) {
  const button = page.locator('form[action="/logout"] button').first();

  if ((await button.count()) > 0 && (await button.isVisible().catch(() => false))) {
    await button.click();
    await expect(page).toHaveURL(/\/login/);
    return;
  }

  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
}

test.describe("AgentGate seeded role login QA", () => {
  for (const account of accounts) {
    test(`${account.label} can log in and reach expected role surfaces`, async ({
      page,
      request,
    }) => {
      test.skip(
        !(await seededDemoAvailable(request)),
        "Seeded AgentGate demo data is required.",
      );

      await login(page, account.email);

      for (const route of account.pages) {
        await page.goto(route);
        await expect(page.locator("body")).not.toContainText("Workspace error");
        await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
        await expect(page.locator("body")).not.toContainText("PrismaClientKnownRequestError");
      }

      await logout(page);
    });
  }

  test("unauthenticated protected route redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

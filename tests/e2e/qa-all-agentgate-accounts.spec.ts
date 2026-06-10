import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const screenshotDir = "docs/qa/runs/latest/screenshots";

const accounts = [
  {
    email: "owner@agentgate.dev",
    label: "owner",
    pages: ["/dashboard", "/agents", "/policies", "/approvals", "/audit-logs", "/settings"],
  },
  {
    email: "security@agentgate.dev",
    label: "security-admin",
    pages: ["/dashboard", "/agents", "/policies", "/approvals", "/audit-logs", "/settings"],
  },
  {
    email: "developer@agentgate.dev",
    label: "developer",
    pages: ["/dashboard", "/agents", "/developer", "/developer/api-keys", "/developer/docs"],
  },
  {
    email: "reviewer@agentgate.dev",
    label: "reviewer",
    pages: ["/dashboard", "/approvals", "/audit-logs"],
  },
  {
    email: "auditor@agentgate.dev",
    label: "auditor",
    pages: ["/dashboard", "/audit-logs", "/reports"],
  },
  {
    email: "platform@agentgate.dev",
    label: "platform-owner",
    pages: ["/platform", "/platform/organizations", "/platform/health"],
  },
];

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|platform)$/);
}

async function logout(page: Page) {
  await page.locator('form[action="/logout"] button').click();
  await expect(page).toHaveURL(/\/login/);
}

for (const account of accounts) {
  test(`${account.label} seeded account can login, navigate, and logout`, async ({ page }) => {
    await login(page, account.email);
    await expect(page.locator("body")).not.toContainText("Workspace error");
    await expect(page.locator("body")).not.toContainText("PrismaClientKnownRequestError");
    await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");

    for (const path of account.pages) {
      await page.goto(path);
      await expect(page.locator("body")).not.toContainText("Workspace error");
      await expect(page.locator("body")).not.toContainText("PrismaClientKnownRequestError");
      await expect(page.locator("main, body").first()).toBeVisible();
    }

    await page.screenshot({
      fullPage: true,
      path: `${screenshotDir}/agentgate-role-${account.label}.png`,
    });
    await logout(page);
  });
}

test("unauthenticated users are redirected from protected app pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

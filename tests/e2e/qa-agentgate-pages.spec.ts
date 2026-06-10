import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const screenshotDir = "docs/qa/runs/latest/screenshots";

async function loginOwner(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@agentgate.dev");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function expectHealthyPage(page: Page) {
  await expect(page.locator("body")).not.toContainText("Workspace error");
  await expect(page.locator("body")).not.toContainText("PrismaClientKnownRequestError");
  await expect(page.locator("body")).not.toContainText("Unhandled Runtime Error");
  await expect(page.locator("body")).not.toContainText("Stack trace");
}

test("public and owner AgentGate pages load without workspace errors", async ({ page }) => {
  test.setTimeout(120_000);

  const publicPages = ["/", "/login", "/register"];

  for (const path of publicPages) {
    await page.goto(path);
    await expectHealthyPage(page);
    await page.screenshot({
      fullPage: true,
      path: `${screenshotDir}/agentgate-public-${path === "/" ? "landing" : path.slice(1)}.png`,
    });
  }

  await loginOwner(page);

  const agentHref = await page
    .locator('a[href^="/agents/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  const policyHref = await page
    .locator('a[href^="/policies/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);

  const pages = [
    "/dashboard",
    "/agents",
    "/agents/new",
    agentHref ?? "/agents",
    "/policies",
    "/policies/new",
    policyHref ?? "/policies",
    "/approvals",
    "/actions",
    "/audit-logs",
    "/integrations",
    "/integrations/demo-commerce",
    "/reports",
    "/developer",
    "/developer/api-keys",
    "/developer/docs",
    "/developer/agent-lab",
    "/settings",
    "/settings/members",
    "/settings/access-review",
    "/settings/data-retention",
    "/billing",
    "/platform",
  ];

  for (const path of pages) {
    await page.goto(path);
    await expectHealthyPage(page);
    await expect(page.locator("main, body").first()).toBeVisible();
    await page.screenshot({
      fullPage: true,
      path: `${screenshotDir}/agentgate-page-${path.replaceAll("/", "_").replace(/^_$/, "landing")}.png`,
    });
  }
});

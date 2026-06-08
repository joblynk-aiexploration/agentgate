import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const screenshotsDir = path.join(process.cwd(), "docs", "screenshots", "ui-polish");

async function capture(page: Page, filename: string) {
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: path.join(screenshotsDir, filename),
  });
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@agentgate.dev");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function captureProtectedPage(page: Page, pathName: string, filename: string, heading: RegExp | string) {
  await page.goto(pathName);
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  await capture(page, filename);
}

test("capture UI polish screenshots", async ({ page }) => {
  await mkdir(screenshotsDir, { recursive: true });
  await page.setViewportSize({ height: 1000, width: 1440 });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AgentGate" })).toBeVisible();
  await capture(page, "01-landing.png");

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Sign in to the AI agent control plane/i })).toBeVisible();
  await capture(page, "02-login.png");

  await login(page);
  await captureProtectedPage(page, "/dashboard", "03-dashboard.png", "Dashboard");
  await captureProtectedPage(page, "/agents", "04-agents.png", "Agent Registry");

  const supportAgent = page.getByRole("link", { name: "Support Refund Agent" });
  if (await supportAgent.isVisible().catch(() => false)) {
    await supportAgent.click();
    await expect(page.getByRole("heading", { name: /Support Refund Agent/ })).toBeVisible();
    await capture(page, "05-agent-detail.png");
  }

  await captureProtectedPage(page, "/policies", "06-policies.png", "Policies");
  await captureProtectedPage(page, "/approvals", "07-approvals.png", "Approval Inbox");

  const approvalHref = await page
    .locator('main a[href^="/approvals/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (approvalHref) {
    await page.goto(approvalHref);
    await expect(page.getByRole("heading", { name: /approval/i })).toBeVisible();
    await capture(page, "08-approval-detail.png");
  }

  await captureProtectedPage(page, "/audit-logs", "09-audit-logs.png", "Audit Logs");
  await captureProtectedPage(page, "/integrations", "10-integrations.png", "Integrations");
  await captureProtectedPage(page, "/integrations/demo-commerce", "11-demo-commerce-monitor.png", /Demo Commerce Monitor/i);
  await captureProtectedPage(page, "/developer/docs", "12-developer-docs.png", "Developer Docs");
  await captureProtectedPage(page, "/developer/agent-lab", "13-agent-lab.png", "Agent Lab");
  await captureProtectedPage(page, "/settings", "14-settings.png", "Settings");
  await captureProtectedPage(page, "/billing", "15-billing.png", "Billing");
});

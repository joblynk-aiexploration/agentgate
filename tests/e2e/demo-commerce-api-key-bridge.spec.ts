import "dotenv/config";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const commerceBaseUrl =
  process.env.COMMERCE_BASE_URL ?? "http://localhost:3004";
const commerceAdminEmail = "admin@northstar-demo.dev";
const commerceAdminPassword = "Password123!";
const commerceAgentSlug = "demo-commerce-support-agent";

async function commerceAvailable(page: Page) {
  const response = await page.request.get(commerceBaseUrl).catch(() => null);

  return Boolean(response?.ok());
}

async function loginAgentGate(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@agentgate.dev");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function loginCommerceAdmin(page: Page) {
  const response = await page.request.post(`${commerceBaseUrl}/api/admin/login`, {
    form: {
      email: commerceAdminEmail,
      password: commerceAdminPassword,
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  const cookie = response
    .headers()["set-cookie"]
    ?.match(/northstar_admin_session=([^;]+)/)?.[1];
  expect(cookie).toBeTruthy();

  await page.context().addCookies([
    {
      name: "northstar_admin_session",
      value: cookie!,
      url: commerceBaseUrl,
    },
  ]);

  await page.goto(`${commerceBaseUrl}/admin`);
  await expect(page).toHaveURL(/\/admin$/);
}

test("created AgentGate key bridges Northstar admin, chat, approvals, and audit visibility", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90_000);

  test.skip(
    !(await commerceAvailable(page)),
    "Northstar commerce app must be running locally. Start it with npm run commerce:dev.",
  );

  await loginAgentGate(page);
  await page.goto("/developer/api-keys");
  await page.getByLabel("Name").fill(`Northstar Commerce Test Key ${Date.now()}`);
  await page.getByLabel("Agent scope").selectOption({
    label: "Demo Commerce Support Agent",
  });
  await page.getByRole("button", { name: "Create key" }).click();

  const fullKey = (await page.locator("code").first().innerText()).trim();
  expect(fullKey).toMatch(/^ag_test_/);
  const prefix = fullKey.slice(0, 17);
  await expect(page.getByText("The full API key is shown once. Copy it now.")).toBeVisible();

  await page.reload();
  await expect(page.getByText(fullKey)).toHaveCount(0);
  await expect(page.getByText(prefix)).toBeVisible();

  await loginCommerceAdmin(page);
  await page.goto(`${commerceBaseUrl}/admin/api`);
  await page.locator('input[name="agentGateBaseUrl"]').fill(baseURL ?? "http://127.0.0.1:3100");
  await page.locator('input[name="agentGateApiKey"]').fill(fullKey);
  await page.locator('input[name="agentId"]').fill(commerceAgentSlug);
  await page.locator('select[name="environment"]').selectOption("production");
  await page.getByRole("button", { name: "Save configuration" }).click();
  await expect(page).toHaveURL(/\/admin\/api\?saved=1$/);
  await expect(page.getByText(`${prefix}...`)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(fullKey);
  await expect(page.locator('input[name="agentGateApiKey"]')).toHaveValue("");

  await page.reload();
  await expect(page.getByText(`${prefix}...`)).toBeVisible();
  await expect(page.getByText(fullKey)).toHaveCount(0);

  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page).toHaveURL(/\/admin\/api\?test=/);
  await expect(page.getByText(/Test decision:/)).toBeVisible();

  await page.goto(commerceBaseUrl);
  await expect(page.getByRole("link", { name: "Northstar Outdoor Supply" })).toBeVisible();
  await expect(page.getByText("SummitPro Backpack")).toBeVisible();
  await page.getByRole("button", { name: "Open Northstar Assistant" }).click();

  await page.locator(".chat-form input").fill("What backpacks do you sell?");
  await page.locator('.chat-form button[type="submit"]').click();
  await expect(page.locator(".message.assistant").last()).toContainText("SummitPro Backpack");

  await page
    .locator(".chat-form input")
    .fill("Cancel my order NS-1002. My email is sarah@example.com.");
  await page.locator('.chat-form button[type="submit"]').click();
  await expect(page.locator(".message.assistant").last()).toContainText(
    "I need approval before I can complete that",
  );
  await expect(page.locator(".message.assistant").last()).toContainText(
    "AgentGate action:",
  );

  await page
    .locator(".chat-form input")
    .fill("Cancel my order NS-1003. My email is sarah@example.com.");
  await page.locator('.chat-form button[type="submit"]').click();
  await expect(page.locator(".message.assistant").last()).toContainText(
    "AgentGate blocked",
  );

  await page
    .locator(".chat-form input")
    .fill("Please resend my receipt for NS-1001 to sarah@example.com.");
  await page.locator('.chat-form button[type="submit"]').click();
  await expect(page.locator(".message.assistant").last()).toContainText(
    /AgentGate action:|needs reviewer approval|simulated a receipt preview/,
  );

  await page
    .locator(".chat-form input")
    .fill("Delete my customer record. My email is sarah@example.com.");
  await page.locator('.chat-form button[type="submit"]').click();
  await expect(page.locator(".message.assistant").last()).toContainText(
    "blocked",
  );

  await page.goto("/integrations/demo-commerce");
  await expect(page.getByRole("heading", { name: "Demo Commerce Monitor" })).toBeVisible();
  await expect(page.locator("table", { hasText: "order.cancel" }).first()).toBeVisible();
  await expect(page.locator("table", { hasText: "REQUIRE_APPROVAL" }).first()).toBeVisible();
  await expect(page.locator("table", { hasText: "customer.delete" }).first()).toBeVisible();
  const commerceApprovalHref = await page
    .locator('main a[href^="/approvals/"]')
    .first()
    .getAttribute("href");
  expect(commerceApprovalHref).toBeTruthy();
  await page.goto(commerceApprovalHref!);
  await expect(page.getByRole("heading", { name: /approval/i })).toBeVisible();
  await page.getByLabel("Review comment").fill("Owner approved ecommerce cancellation through real UI.");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Workspace error")).toHaveCount(0);
  await expect(page.locator("main").getByText("APPROVED").first()).toBeVisible();

  await page.goto("/approvals");
  await expect(page.locator("table", { hasText: "order.cancel" }).first()).toBeVisible();

  await page.goto("/audit-logs");
  await expect(page.locator("table", { hasText: "approval.approved" }).first()).toBeVisible();
  await expect(page.locator("table", { hasText: "gateway.action_checked" }).first()).toBeVisible();
});

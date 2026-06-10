import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const commerceBaseUrl = process.env.COMMERCE_BASE_URL ?? "http://localhost:3004";

async function commerceAvailable(page: Page) {
  const response = await page.request.get(commerceBaseUrl).catch(() => null);
  return Boolean(response?.ok());
}

async function loginAgentGate(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function loginCommerceAdmin(page: Page) {
  await page.goto(`${commerceBaseUrl}/admin/login`);
  await page.locator('input[name="email"]').fill("admin@northstar-demo.dev");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function loginCommerceCustomer(page: Page) {
  await page.goto(`${commerceBaseUrl}/login`);
  await page.locator('input[name="email"]').fill("customer@northstar-demo.dev");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

test("full AgentGate and Northstar cancellation governance path", async ({ page }) => {
  test.skip(
    !(await commerceAvailable(page)),
    "Northstar commerce app must run on localhost:3004.",
  );

  await loginCommerceAdmin(page);
  await page.goto(`${commerceBaseUrl}/admin/api`);
  await expect(page.locator('input[name="agentGateBaseUrl"]')).toHaveValue(
    "http://localhost:3001",
  );
  await expect(page.locator('input[name="agentId"]')).toHaveValue(
    "demo-commerce-support-agent",
  );
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page).toHaveURL(/\/admin\/api\?test=/);
  await expect(page.getByText(/Test decision:/)).toBeVisible();

  await loginCommerceCustomer(page);
  await page.goto(`${commerceBaseUrl}/products/summitpro-backpack`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.locator('input[name="addressLine1"]').fill("120 Trail Ridge Road");
  await page.locator('input[name="city"]').fill("Austin");
  await page.locator('input[name="state"]').fill("TX");
  await page.locator('input[name="zip"]').fill("78701");
  await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=NS-/);
  const orderNumber = new URL(page.url()).searchParams.get("order");
  expect(orderNumber).toBeTruthy();

  await page.goto(commerceBaseUrl);
  await page.getByRole("button", { name: "Open Northstar Assistant" }).click();
  await page.locator(".chat-form input").fill("Cancel my latest order.");
  await page.locator('.chat-form button[type="submit"]').click();
  const response = page.locator(".message.assistant").last();
  await expect(response).toContainText("Decision: REQUIRE_APPROVAL");
  const actionRequestId = (await response.locator(".debug-box div", { hasText: "Action:" }).innerText())
    .replace("Action:", "")
    .trim();
  const approvalRequestId = (await response.locator(".debug-box div", { hasText: "Approval:" }).innerText())
    .replace("Approval:", "")
    .trim();

  await loginAgentGate(page, "owner@agentgate.dev");
  await page.goto("/integrations/demo-commerce");
  await expect(page.locator("table", { hasText: actionRequestId }).first()).toBeVisible();
  await page.goto("/approvals");
  await expect(page.locator(`a[href="/approvals/${approvalRequestId}"]`).first()).toBeVisible();

  await page.locator('form[action="/logout"] button').click();
  await loginAgentGate(page, "reviewer@agentgate.dev");
  await page.goto(`/approvals/${approvalRequestId}`);
  await page.getByLabel("Review comment").fill("QA approval for Northstar cancellation.");
  await page.getByRole("button", { name: /^Approve$/ }).click();
  await expect(page.locator("main").getByText("APPROVED").first()).toBeVisible();

  await loginCommerceAdmin(page);
  await page.goto(`${commerceBaseUrl}/admin/orders`);
  await page.getByRole("button", { name: "Sync approved AgentGate actions" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\?synced=/);

  await page.goto(`${commerceBaseUrl}/admin/orders/${orderNumber}`);
  await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
  await page.goto("/audit-logs");
  const actionTrail = await page.evaluate(async (id) => {
    const response = await fetch(`/api/actions/${id}`);
    const body = await response.json();

    return {
      auditEvents: (body.auditLogs ?? []).map(
        (log: { eventType?: string }) => log.eventType,
      ) as string[],
      ok: response.ok,
      status: body.action?.status as string | undefined,
    };
  }, actionRequestId);
  expect(actionTrail.ok).toBe(true);
  expect(actionTrail.status).toBe("EXECUTED");
  expect(actionTrail.auditEvents).toContain("approval.approved");
  expect(actionTrail.auditEvents).toContain("gateway.action_executed");
});

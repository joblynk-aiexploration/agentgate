import "dotenv/config";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const commerceBaseUrl =
  process.env.COMMERCE_BASE_URL ?? "http://localhost:3004";
const demoCommerceKey = "ag_test_seed_demo_commerce_agent_key";
const demoCommerceKeyPrefix = demoCommerceKey.slice(0, 17);
const actionStatus = {
  APPROVED: "APPROVED",
  EXECUTED: "EXECUTED",
} as const;
const approvalStatus = {
  APPROVED: "APPROVED",
} as const;

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

async function logoutAgentGate(page: Page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function loginCommerceAdmin(page: Page) {
  const response = await page.request.post(`${commerceBaseUrl}/api/admin/login`, {
    form: {
      email: "admin@northstar-demo.dev",
      password: "Password123!",
    },
    maxRedirects: 0,
  });
  const cookie = response
    .headers()["set-cookie"]
    ?.match(/northstar_admin_session=([^;]+)/)?.[1];

  expect(response.status()).toBe(303);
  expect(cookie).toBeTruthy();

  await page.context().addCookies([
    {
      name: "northstar_admin_session",
      url: commerceBaseUrl,
      value: cookie!,
    },
  ]);
}

async function loginCommerceCustomer(page: Page) {
  await page.goto(`${commerceBaseUrl}/login`);
  await page.locator('input[name="email"]').fill("customer@northstar-demo.dev");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function sendChat(page: Page, message: string) {
  await page.locator(".chat-form input").fill(message);
  await page.locator('.chat-form button[type="submit"]').click();
  return page.locator(".message.assistant").last();
}

test("customer checkout order routes commerce agent actions through AgentGate", async ({
  baseURL,
  page,
}) => {
  test.setTimeout(120_000);
  test.skip(
    !(await commerceAvailable(page)),
    "Northstar commerce app must be running locally on port 3004.",
  );

  await loginCommerceAdmin(page);
  await page.goto(`${commerceBaseUrl}/admin/api`);
  await page.locator('input[name="agentGateBaseUrl"]').fill(baseURL ?? "http://127.0.0.1:3001");
  await page.locator('input[name="agentGateApiKey"]').fill(demoCommerceKey);
  await page.locator('input[name="agentId"]').fill("demo-commerce-support-agent");
  await page.locator('select[name="environment"]').selectOption("production");
  await page.getByRole("button", { name: "Save configuration" }).click();
  await expect(page).toHaveURL(/\/admin\/api\?saved=1$/);
  await expect(page.getByText(`${demoCommerceKeyPrefix}...`)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(demoCommerceKey);
  await expect(page.locator('input[name="agentGateApiKey"]')).toHaveValue("");

  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page).toHaveURL(/\/admin\/api\?test=/);
  await expect(page.getByText(/Test decision:/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(demoCommerceKey);

  await loginCommerceCustomer(page);
  await page.goto(`${commerceBaseUrl}/products/summitpro-backpack`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByText("SummitPro Backpack")).toBeVisible();
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.locator('input[name="addressLine1"]').fill("120 Trail Ridge Road");
  await page.locator('input[name="city"]').fill("Austin");
  await page.locator('input[name="state"]').fill("TX");
  await page.locator('input[name="zip"]').fill("78701");
  await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=NS-/);
  const orderNumber = new URL(page.url()).searchParams.get("order");

  expect(orderNumber).toMatch(/^NS-\d+$/);
  await expect(page.getByText(`Your local demo order ${orderNumber}`)).toBeVisible();

  await page.goto(`${commerceBaseUrl}/account/orders/${orderNumber}`);
  await expect(page.getByRole("heading", { name: orderNumber! })).toBeVisible();
  await expect(page.getByText("SummitPro Backpack")).toBeVisible();
  await expect(page.getByText("Processing")).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();

  await page.goto(commerceBaseUrl);
  await page.getByRole("button", { name: "Open Northstar Assistant" }).click();

  await expect(await sendChat(page, "What backpacks do you sell?")).toContainText(
    "SummitPro Backpack",
  );
  await expect(await sendChat(page, "Where is order NS-DOES-NOT-EXIST?")).toContainText(
    /could not find|cannot find|valid demo order|verify ownership/i,
  );
  await expect(await sendChat(page, "Where is my latest order?")).toContainText(
    orderNumber!,
  );
  await expect(page.locator(".message.assistant").last()).toContainText("processing");

  const cancelResponse = await sendChat(page, "Cancel my latest order.");
  await expect(cancelResponse).toContainText(
    "I need approval before I can complete that",
  );
  await expect(cancelResponse).toContainText("Decision: REQUIRE_APPROVAL");
  const actionRequestText = await cancelResponse
    .locator(".debug-box div", { hasText: "Action:" })
    .innerText();
  const approvalRequestText = await cancelResponse
    .locator(".debug-box div", { hasText: "Approval:" })
    .innerText();
  const actionRequestId = actionRequestText.replace("Action:", "").trim();
  const approvalRequestId = approvalRequestText.replace("Approval:", "").trim();

  expect(actionRequestId).toBeTruthy();
  expect(approvalRequestId).toBeTruthy();

  await page.goto(`${commerceBaseUrl}/account/orders/${orderNumber}`);
  await expect(page.getByText("Cancellation pending AgentGate approval")).toBeVisible();
  await expect(page.getByText("Processing")).toBeVisible();

  const receiptResponse = await sendChatFromHome(
    page,
    "Please resend my receipt for my latest order.",
  );
  await expect(receiptResponse).toContainText(/needs reviewer approval|simulated a receipt preview/i);

  const deleteResponse = await sendChatFromHome(page, "Delete my customer record.");
  await expect(deleteResponse).toContainText(/blocked|no customer record was deleted/i);

  await loginAgentGate(page, "owner@agentgate.dev");
  await page.goto("/integrations/demo-commerce");
  await expect(page.getByRole("heading", { name: "Demo Commerce Monitor" })).toBeVisible();
  await expect(page.locator("table", { hasText: "order.cancel" }).first()).toBeVisible();
  await expect(page.locator("table", { hasText: "REQUIRE_APPROVAL" }).first()).toBeVisible();
  await expect(page.locator("table", { hasText: "customer.delete" }).first()).toBeVisible();
  await page.goto("/approvals");
  await expect(page.locator("table", { hasText: "order.cancel" }).first()).toBeVisible();
  await page.goto("/audit-logs");
  await expect(page.locator("table", { hasText: "gateway.action_checked" }).first()).toBeVisible();
  await expect(page.locator("table", { hasText: "approval.requested" }).first()).toBeVisible();
  await expect(page.locator("table", { hasText: "action.blocked" }).first()).toBeVisible();

  await logoutAgentGate(page);
  await loginAgentGate(page, "reviewer@agentgate.dev");
  await page.goto(`/approvals/${approvalRequestId}`);
  await expect(page.getByRole("heading", { name: /approval/i })).toBeVisible();
  await page.getByLabel("Review comment").fill("Reviewer approved Northstar cancellation during E2E.");
  await page.getByRole("button", { name: /^Approve$/ }).click();
  await expect(page.getByText("Workspace error")).toHaveCount(0);
  await expect
    .poll(async () =>
      page.evaluate(async (id) => {
        const response = await fetch(`/api/approvals/${id}`);
        const body = await response.json();

        return {
          ok: response.ok,
          approvalStatus: body.approval?.status as string | undefined,
          actionStatus: body.approval?.actionRequest?.status as string | undefined,
        };
      }, approvalRequestId),
    )
    .toMatchObject({
      ok: true,
      approvalStatus: approvalStatus.APPROVED,
      actionStatus: actionStatus.APPROVED,
    });
  await expect(page.locator("main").getByText("APPROVED").first()).toBeVisible();

  await loginCommerceAdmin(page);
  await page.goto(`${commerceBaseUrl}/admin/orders`);
  await page.getByRole("button", { name: "Sync approved AgentGate actions" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\?synced=/);
  await expect(page.getByText("AgentGate sync complete.")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(demoCommerceKey);

  await page.goto(`${commerceBaseUrl}/account/orders/${orderNumber}`);
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByText("Admin demo sync executed the approved AgentGate action")).toBeVisible();

  await loginAgentGate(page, "owner@agentgate.dev");
  await page.goto(`/actions/${actionRequestId}`);
  await expect(page.getByText(actionStatus.EXECUTED).first()).toBeVisible();
  await page.goto("/audit-logs");
  await expect(page.locator("table", { hasText: "approval.approved" }).first()).toBeVisible();
  await expect(page.locator("table", { hasText: "gateway.action_executed" }).first()).toBeVisible();
});

async function sendChatFromHome(page: Page, message: string) {
  await page.goto(commerceBaseUrl);
  await page.getByRole("button", { name: "Open Northstar Assistant" }).click();
  return sendChat(page, message);
}

import { expect, test } from "@playwright/test";

const commerceBaseUrl = process.env.COMMERCE_BASE_URL ?? "http://localhost:3004";
const forbiddenDemoKey = ["ag_test_seed", "demo_commerce_agent_key"].join("_");

test("Northstar admin operations pages load and API config is prefix-only", async ({
  page,
}) => {
  await page.goto(`${commerceBaseUrl}/admin/login`);
  await page.locator('input[name="email"]').fill("admin@northstar-demo.dev");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  for (const path of [
    "/admin",
    "/admin/orders",
    "/admin/products",
    "/admin/customers",
    "/admin/fulfillment",
    "/admin/tracking",
    "/admin/api",
    "/admin/agent-logs",
    "/admin/settings",
  ]) {
    await page.goto(`${commerceBaseUrl}${path}`);
    await expect(page.locator("body")).not.toContainText(forbiddenDemoKey);
    await expect(page.locator("main, body").first()).toBeVisible();
  }

  await page.goto(`${commerceBaseUrl}/admin/api`);
  await expect(page.getByText(/ag_test_/).first()).toBeVisible();
  await expect(page.locator('input[name="agentGateApiKey"]')).toHaveValue("");
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page).toHaveURL(/\/admin\/api\?test=/);
  await expect(page.getByText(/Test decision:/)).toBeVisible();
});

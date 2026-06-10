import { expect, test } from "@playwright/test";

const commerceBaseUrl = process.env.COMMERCE_BASE_URL ?? "http://localhost:3004";
const forbiddenDemoKey = ["ag_test_seed", "demo_commerce_agent_key"].join("_");

test("Northstar customer and admin accounts have correct access boundaries", async ({
  page,
}) => {
  await page.goto(`${commerceBaseUrl}/login`);
  await page.locator('input[name="email"]').fill("customer@northstar-demo.dev");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto(`${commerceBaseUrl}/account/orders`);
  await expect(page.getByRole("heading", { name: "Your order history" })).toBeVisible();
  await page.goto(`${commerceBaseUrl}/admin`);
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.goto(`${commerceBaseUrl}/admin/login`);
  await page.locator('input[name="email"]').fill("admin@northstar-demo.dev");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  for (const path of [
    "/admin/orders",
    "/admin/products",
    "/admin/customers",
    "/admin/api",
    "/admin/agent-logs",
    "/admin/fulfillment",
    "/admin/tracking",
    "/admin/settings",
  ]) {
    await page.goto(`${commerceBaseUrl}${path}`);
    await expect(page.locator("body")).not.toContainText(forbiddenDemoKey);
    await expect(page.locator("main, body").first()).toBeVisible();
  }
});

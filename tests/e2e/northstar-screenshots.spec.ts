import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const commerceBaseUrl = process.env.COMMERCE_BASE_URL ?? "http://localhost:3004";
const screenshotDir = "apps/demo-commerce-store/docs/screenshots";

async function commerceAvailable(page: Page) {
  const response = await page.request.get(commerceBaseUrl).catch(() => null);

  return Boolean(response?.ok());
}

async function loginCustomer(page: Page) {
  await page.goto(`${commerceBaseUrl}/login`);
  await page.locator('input[name="email"]').fill("customer@northstar-demo.dev");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function loginAdmin(page: Page) {
  await page.goto(`${commerceBaseUrl}/admin/login`);
  await page.locator('input[name="email"]').fill("admin@northstar-demo.dev");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function checkoutOrder(page: Page) {
  await loginCustomer(page);
  await page.goto(`${commerceBaseUrl}/products/summitpro-backpack`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/cart/);
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=NS-/);

  const orderNumber = new URL(page.url()).searchParams.get("order");
  expect(orderNumber).toBeTruthy();

  return orderNumber!;
}

test("capture redesigned Northstar ecommerce screenshots", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!(await commerceAvailable(page)), "Northstar commerce app must run on localhost:3004.");

  await page.goto(commerceBaseUrl);
  await page.screenshot({ path: `${screenshotDir}/01-homepage.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/products`);
  await page.screenshot({ path: `${screenshotDir}/02-products.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/products/summitpro-backpack`);
  await page.screenshot({ path: `${screenshotDir}/03-product-detail.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/login`);
  await page.screenshot({ path: `${screenshotDir}/04-customer-login.png`, fullPage: true });

  const orderNumber = await checkoutOrder(page);

  await page.goto(`${commerceBaseUrl}/cart`);
  await page.screenshot({ path: `${screenshotDir}/05-cart.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/checkout/success?order=${orderNumber}`);
  await page.screenshot({ path: `${screenshotDir}/06-checkout-success.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/account`);
  await page.screenshot({ path: `${screenshotDir}/07-customer-account.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/account/orders`);
  await page.screenshot({ path: `${screenshotDir}/08-customer-orders.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/account/orders/${orderNumber}`);
  await page.screenshot({ path: `${screenshotDir}/09-customer-order-detail.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/account/tracking`);
  await page.screenshot({ path: `${screenshotDir}/10-customer-tracking.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/admin/login`);
  await page.screenshot({ path: `${screenshotDir}/11-admin-login.png`, fullPage: true });

  await loginAdmin(page);
  await page.screenshot({ path: `${screenshotDir}/12-admin-dashboard.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/admin/orders`);
  await page.screenshot({ path: `${screenshotDir}/13-admin-orders.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/admin/orders/${orderNumber}`);
  await page.screenshot({ path: `${screenshotDir}/14-admin-order-detail.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/admin/api`);
  await page.screenshot({ path: `${screenshotDir}/15-admin-api-config.png`, fullPage: true });

  await page.goto(`${commerceBaseUrl}/admin/agent-logs`);
  await page.screenshot({ path: `${screenshotDir}/16-admin-agent-logs.png`, fullPage: true });

  await page.goto(commerceBaseUrl);
  await page.getByRole("button", { name: "Open Northstar Assistant" }).click();
  await page.screenshot({ path: `${screenshotDir}/17-chat-open.png`, fullPage: true });

  await page.locator(".chat-form input").fill("Cancel my latest order.");
  await page.locator('.chat-form button[type="submit"]').click();
  await expect(page.locator(".message.assistant").last()).toContainText(/approval|review/i);
  await page.screenshot({ path: `${screenshotDir}/18-chat-agentgate-approval.png`, fullPage: true });
});

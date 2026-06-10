import { expect, test } from "@playwright/test";

const commerceBaseUrl = process.env.COMMERCE_BASE_URL ?? "http://localhost:3004";

test("Northstar customer can browse, checkout, and view tracking/receipt", async ({
  page,
}) => {
  await page.goto(`${commerceBaseUrl}/login`);
  await page.locator('input[name="email"]').fill("customer@northstar-demo.dev");
  await page.locator('input[name="password"]').fill("Password123!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto(`${commerceBaseUrl}/products`);
  await expect(page.getByText("SummitPro Backpack").first()).toBeVisible();
  await page.goto(`${commerceBaseUrl}/products/summitpro-backpack`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/cart/);
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.locator('input[name="addressLine1"]').fill("120 Trail Ridge Road");
  await page.locator('input[name="city"]').fill("Austin");
  await page.locator('input[name="state"]').fill("TX");
  await page.locator('input[name="zip"]').fill("78701");
  await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?order=NS-/);
  const orderNumber = new URL(page.url()).searchParams.get("order");
  expect(orderNumber).toMatch(/^NS-\d+$/);

  await page.goto(`${commerceBaseUrl}/account/orders/${orderNumber}`);
  await expect(page.getByRole("heading", { name: orderNumber! })).toBeVisible();
  await expect(page.getByText("SummitPro Backpack").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("4242 4242 4242 4242");
  await page.goto(`${commerceBaseUrl}/account/tracking`);
  await expect(page.getByText(orderNumber!).first()).toBeVisible();
  await page.goto(`${commerceBaseUrl}/account/receipts`);
  await expect(page.getByText(orderNumber!).first()).toBeVisible();
});

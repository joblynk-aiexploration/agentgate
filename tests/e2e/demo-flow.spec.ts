import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

async function seededDemoAvailable(request: APIRequestContext) {
  const response = await request.get("/api/demo/status");

  if (!response.ok()) {
    return false;
  }

  const body = (await response.json()) as { ok?: boolean };

  return body.ok === true;
}

test("public demo surfaces load", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /the safety, approval, and audit layer for ai agents/i,
    }),
  ).toBeVisible();

  await page.goto("/demo");
  await expect(
    page.getByRole("heading", {
      name: /watch agentgate catch a high-risk ai agent action/i,
    }),
  ).toBeVisible();

  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: /sign in to the ai agent control plane/i }),
  ).toBeVisible();
});

test("seeded owner can inspect core demo pages", async ({ page, request }) => {
  test.skip(
    !(await seededDemoAvailable(request)),
    "Seeded database is required for the authenticated demo flow. Run migrations and npm run prisma:seed.",
  );

  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@agentgate.dev");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/agents");
  await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();
  await expect(page.getByText("Support Refund Agent")).toBeVisible();

  await page.goto("/policies");
  await expect(page.getByRole("heading", { name: "Policies" })).toBeVisible();
  await expect(page.getByText(/Refunds above \$500 require approval/i)).toBeVisible();

  await page.goto("/approvals");
  await expect(page.getByRole("heading", { name: "Approval Inbox" })).toBeVisible();

  await page.goto("/audit-logs");
  await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();

  await page.goto("/developer/docs");
  await expect(page.getByRole("heading", { name: "Developer Docs" })).toBeVisible();
});

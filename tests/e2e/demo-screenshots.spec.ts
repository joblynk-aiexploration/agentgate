import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const screenshotsDir = path.join(process.cwd(), "docs", "screenshots");
const demoApiKey = "ag_test_seed_support_refund_demo_key";

type AgentLabRunResult = {
  actionRequestId: string;
  approvalRequestId: string;
};

async function capture(page: Page, filename: string) {
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: path.join(screenshotsDir, filename),
  });
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function logout(page: Page) {
  const logoutButton = page.getByRole("button", { name: "Logout" });

  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await expect(page).toHaveURL(/\/login$/);
    return;
  }

  await page.context().clearCookies();
}

async function runLargeRefund(page: Page): Promise<AgentLabRunResult> {
  await page.goto("/developer/agent-lab");
  await expect(page.getByRole("heading", { name: "Agent Lab" })).toBeVisible();
  await capture(page, "07-agent-lab.png");

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/demo/support-agent/run") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run scenario" }).nth(1).click();
  const response = await responsePromise;
  const body = await response.json();
  const result = body.result?.decision;

  expect(response.ok()).toBe(true);
  expect(result?.decision).toBe("REQUIRE_APPROVAL");
  expect(result?.actionRequestId).toBeTruthy();
  expect(result?.approvalRequestId).toBeTruthy();

  await expect(page.getByText("AgentGate Decision")).toBeVisible();
  await expect(page.getByText("Requires approval").first()).toBeVisible();
  await expect(
    page.locator("span").filter({ hasText: result.approvalRequestId }).first(),
  ).toBeVisible();
  await capture(page, "08-large-refund-decision.png");

  return {
    actionRequestId: result.actionRequestId,
    approvalRequestId: result.approvalRequestId,
  };
}

async function assertApprovalStatus(
  page: Page,
  approvalRequestId: string,
  approvalStatus: string,
  actionStatus: string,
) {
  await expect
    .poll(async () =>
      page.evaluate(async (id) => {
        const response = await fetch(`/api/approvals/${id}`);
        const body = await response.json();

        return {
          ok: response.ok,
          actionStatus: body.approval?.actionRequest?.status as string | undefined,
          approvalStatus: body.approval?.status as string | undefined,
        };
      }, approvalRequestId),
    )
    .toMatchObject({
      actionStatus,
      approvalStatus,
      ok: true,
    });
}

async function waitForActionAudit(
  page: Page,
  actionRequestId: string,
  eventType: string,
) {
  await expect
    .poll(async () =>
      page.evaluate(async ({ actionRequestId: id, eventType: event }) => {
        const response = await fetch(`/api/actions/${id}`);
        const body = await response.json();
        const events = (body.auditLogs ?? []).map(
          (log: { eventType?: string }) => log.eventType,
        ) as string[];

        return {
          hasEvent: events.includes(event),
          ok: response.ok,
          status: body.action?.status as string | undefined,
        };
      }, { actionRequestId, eventType }),
    )
    .toMatchObject({
      hasEvent: true,
      ok: true,
    });
}

test("generate AgentGate visual demo screenshots", async ({ page, request }) => {
  await mkdir(screenshotsDir, { recursive: true });
  await page.setViewportSize({ height: 1000, width: 1440 });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AgentGate" })).toBeVisible();
  await expect(
    page.getByText(/the safety, approval, and audit layer for ai agents/i),
  ).toBeVisible();
  await capture(page, "01-landing.png");

  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: /sign in to the ai agent control plane/i }),
  ).toBeVisible();
  await capture(page, "02-login.png");

  await login(page, "owner@agentgate.dev");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await capture(page, "03-dashboard.png");

  await page.goto("/agents");
  await expect(page.getByRole("heading", { name: "Agent Registry" })).toBeVisible();
  await capture(page, "04-agents.png");
  await page.getByRole("link", { name: "Support Refund Agent" }).click();
  await expect(page.getByRole("heading", { name: /Support Refund Agent/ })).toBeVisible();
  await capture(page, "05-support-refund-agent.png");

  await page.goto("/policies");
  await expect(page.getByRole("heading", { name: "Policies" })).toBeVisible();
  await capture(page, "06-policies.png");

  const { actionRequestId, approvalRequestId } = await runLargeRefund(page);

  await page.goto("/approvals");
  await expect(page.getByRole("heading", { name: "Approval Inbox" })).toBeVisible();
  await capture(page, "09-approvals.png");

  await page.goto(`/approvals/${approvalRequestId}`);
  await expect(page.getByRole("heading", { name: /approval/i })).toBeVisible();
  await capture(page, "10-approval-detail-pending.png");

  await logout(page);
  await login(page, "auditor@agentgate.dev");
  await page.goto(`/approvals/${approvalRequestId}`);
  await expect(page.getByRole("heading", { name: /approval/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();
  await capture(page, "16-role-restriction-auditor.png");

  await logout(page);
  await login(page, "developer@agentgate.dev");
  await page.goto(`/approvals/${approvalRequestId}`);
  await expect(page.getByText(/not found|404/i).first()).toBeVisible();
  await capture(page, "17-role-restriction-developer.png");

  await logout(page);
  await login(page, "reviewer@agentgate.dev");
  await page.goto(`/approvals/${approvalRequestId}`);
  await expect(page.getByRole("heading", { name: /approval/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeEnabled();
  await capture(page, "11-reviewer-approval.png");
  await page
    .getByLabel("Review comment")
    .fill("Approved during visual demo screenshot generation.");
  await page.getByRole("button", { name: "Approve" }).click();
  await assertApprovalStatus(page, approvalRequestId, "APPROVED", "APPROVED");
  await page.reload();
  await expect(page.getByRole("heading", { name: /approval/i })).toBeVisible();
  await capture(page, "12-approval-approved.png");

  const executeResponse = await request.post("/api/gateway/execute", {
    data: { actionRequestId },
    headers: {
      Authorization: `Bearer ${demoApiKey}`,
    },
  });
  expect(executeResponse.ok()).toBe(true);
  await waitForActionAudit(page, actionRequestId, "gateway.action_executed");

  await logout(page);
  await login(page, "owner@agentgate.dev");
  await page.goto("/audit-logs");
  await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "approval.approved" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "gateway.action_executed" }).first(),
  ).toBeVisible();
  await capture(page, "13-audit-logs.png");

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await capture(page, "14-settings.png");

  await page.goto("/billing");
  await expect(
    page.getByRole("heading", { exact: true, name: "Billing" }),
  ).toBeVisible();
  await capture(page, "15-billing.png");

  await page.goto("/developer/docs");
  await expect(
    page.getByRole("heading", { exact: true, name: "Developer Docs" }),
  ).toBeVisible();
  await capture(page, "18-developer-docs.png");
});

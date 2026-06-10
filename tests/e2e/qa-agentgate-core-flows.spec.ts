import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|platform)$/);
}

async function runAgentLabScenario(page: Page, scenario: string) {
  return page.evaluate(async (scenarioName) => {
    const response = await fetch("/api/demo/support-agent/run", {
      body: JSON.stringify({ scenario: scenarioName }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = await response.json();

    return {
      actionRequestId: body.result?.decision?.actionRequestId as string | undefined,
      approvalRequestId: body.result?.decision?.approvalRequestId as string | undefined,
      decision: body.result?.decision?.decision as string | undefined,
      ok: response.ok,
      riskLevel: body.result?.decision?.risk?.level as string | undefined,
      status: response.status,
    };
  }, scenario);
}

test("Agent Lab decisions, reviewer approval, role denial, and audit trail work", async ({
  page,
}) => {
  await login(page, "owner@agentgate.dev");
  await page.goto("/developer/agent-lab");

  const largeRefund = await runAgentLabScenario(page, "large-refund");
  expect(largeRefund).toMatchObject({
    decision: "REQUIRE_APPROVAL",
    ok: true,
    status: 200,
  });
  expect(largeRefund.approvalRequestId).toBeTruthy();

  const blockedDelete = await runAgentLabScenario(page, "blocked-delete");
  expect(blockedDelete).toMatchObject({
    decision: "BLOCK",
    ok: true,
    status: 200,
  });

  await page.locator('form[action="/logout"] button').click();
  await login(page, "auditor@agentgate.dev");
  await page.goto(`/approvals/${largeRefund.approvalRequestId}`);
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();
  const auditorStatus = await page.evaluate(async (id) => {
    const response = await fetch(`/api/approvals/${id}/approve`, {
      body: JSON.stringify({ comment: "Auditor cannot approve." }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    return response.status;
  }, largeRefund.approvalRequestId);
  expect(auditorStatus).toBe(403);

  await page.locator('form[action="/logout"] button').click();
  await login(page, "reviewer@agentgate.dev");
  await page.goto(`/approvals/${largeRefund.approvalRequestId}`);
  await page.getByLabel("Review comment").fill("QA reviewer approval.");
  await page.getByRole("button", { name: /^Approve$/ }).click();
  await expect(page.locator("main").getByText("APPROVED").first()).toBeVisible();

  const approved = await page.evaluate(async (id) => {
    const response = await fetch(`/api/approvals/${id}`);
    const body = await response.json();
    return {
      actionStatus: body.approval?.actionRequest?.status as string | undefined,
      approvalStatus: body.approval?.status as string | undefined,
      ok: response.ok,
    };
  }, largeRefund.approvalRequestId);
  expect(approved).toMatchObject({
    actionStatus: "APPROVED",
    approvalStatus: "APPROVED",
    ok: true,
  });

  await page.locator('form[action="/logout"] button').click();
  await login(page, "owner@agentgate.dev");
  await page.goto("/audit-logs");
  const approvedActionAudit = await page.evaluate(async (id) => {
    const response = await fetch(`/api/actions/${id}`);
    const body = await response.json();

    return {
      auditEvents: (body.auditLogs ?? []).map(
        (log: { eventType?: string }) => log.eventType,
      ) as string[],
      ok: response.ok,
    };
  }, largeRefund.actionRequestId);
  expect(approvedActionAudit.ok).toBe(true);
  expect(approvedActionAudit.auditEvents).toContain("approval.approved");

  const blockedAudit = await page.evaluate(async (id) => {
    const response = await fetch(`/api/actions/${id}`);
    const body = await response.json();

    return {
      auditEvents: (body.auditLogs ?? []).map(
        (log: { eventType?: string }) => log.eventType,
      ) as string[],
      ok: response.ok,
    };
  }, blockedDelete.actionRequestId);
  expect(blockedAudit.ok).toBe(true);
  expect(blockedAudit.auditEvents).toContain("action.blocked");
});

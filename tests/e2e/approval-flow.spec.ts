import "dotenv/config";
import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

const demoApiKey = "ag_test_seed_support_refund_demo_key";
const actionStatus = {
  APPROVED: "APPROVED",
  EXECUTED: "EXECUTED",
} as const;
const approvalStatus = {
  APPROVED: "APPROVED",
} as const;

async function seededDemoAvailable(request: APIRequestContext) {
  const response = await request.get("/api/demo/status");

  if (!response.ok()) {
    return false;
  }

  const body = (await response.json()) as { ok?: boolean };

  return body.ok === true;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function runLargeRefundFromAgentLab(page: Page) {
  await page.goto("/developer/agent-lab");
  await expect(page.getByRole("heading", { name: "Agent Lab" })).toBeVisible();

  const result = await page.evaluate(async () => {
    const response = await fetch("/api/demo/support-agent/run", {
      body: JSON.stringify({ scenario: "large-refund" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      actionRequestId: body.result?.decision?.actionRequestId as string | undefined,
      approvalRequestId: body.result?.decision?.approvalRequestId as string | undefined,
      decision: body.result?.decision?.decision as string | undefined,
      requiresApproval: body.result?.decision?.requiresApproval as boolean | undefined,
      riskLevel: body.result?.decision?.risk?.level as string | undefined,
      error: body.error as string | undefined,
    };
  });

  expect(result, result.error).toMatchObject({
    ok: true,
    status: 200,
    decision: "REQUIRE_APPROVAL",
    requiresApproval: true,
  });
  expect(result.actionRequestId).toBeTruthy();
  expect(result.approvalRequestId).toBeTruthy();
  expect(["HIGH", "CRITICAL"]).toContain(result.riskLevel);

  return {
    actionRequestId: result.actionRequestId!,
    approvalRequestId: result.approvalRequestId!,
  };
}

test("reviewer approves real approval UI flow and gateway executes after approval", async ({
  page,
  request,
}) => {
  test.skip(
    !(await seededDemoAvailable(request)),
    "Seeded database is required. Run migrations and npm run prisma:seed or npm run demo:reset.",
  );

  await login(page, "owner@agentgate.dev");
  const { actionRequestId, approvalRequestId } =
    await runLargeRefundFromAgentLab(page);
  const ownerApproval = await runLargeRefundFromAgentLab(page);
  const ownerApprovalAttempt = await page.evaluate(async (id) => {
    const response = await fetch(`/api/approvals/${id}/approve`, {
      body: JSON.stringify({ comment: "Owner approval verified through E2E." }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    return {
      status: response.status,
      ok: body.ok as boolean | undefined,
      approvalStatus: body.status as string | undefined,
      actionStatus: body.actionStatus as string | undefined,
    };
  }, ownerApproval.approvalRequestId);
  expect(ownerApprovalAttempt).toMatchObject({
    status: 200,
    ok: true,
    approvalStatus: approvalStatus.APPROVED,
    actionStatus: actionStatus.APPROVED,
  });

  const securityApproval = await runLargeRefundFromAgentLab(page);

  await page.goto("/approvals");
  await expect(
    page.locator(`a[href="/approvals/${approvalRequestId}"]`).first(),
  ).toBeVisible();

  const pendingExecute = await request.post("/api/gateway/execute", {
    data: { actionRequestId },
    headers: {
      Authorization: `Bearer ${demoApiKey}`,
    },
  });
  expect(pendingExecute.status()).toBe(400);

  await logout(page);

  await login(page, "security@agentgate.dev");
  const securityApprovalAttempt = await page.evaluate(async (id) => {
    const response = await fetch(`/api/approvals/${id}/approve`, {
      body: JSON.stringify({ comment: "Security admin approval verified through E2E." }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    return {
      status: response.status,
      ok: body.ok as boolean | undefined,
      approvalStatus: body.status as string | undefined,
      actionStatus: body.actionStatus as string | undefined,
    };
  }, securityApproval.approvalRequestId);
  expect(securityApprovalAttempt).toMatchObject({
    status: 200,
    ok: true,
    approvalStatus: approvalStatus.APPROVED,
    actionStatus: actionStatus.APPROVED,
  });

  await logout(page);

  await login(page, "auditor@agentgate.dev");
  await page.goto(`/approvals/${approvalRequestId}`);
  await expect(page.getByRole("heading", { name: /approval/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();

  const auditorApprovalAttempt = await page.evaluate(async (id) => {
    const response = await fetch(`/api/approvals/${id}/approve`, {
      body: JSON.stringify({ comment: "Auditor should not approve." }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    return response.status;
  }, approvalRequestId);
  expect(auditorApprovalAttempt).toBe(403);

  await logout(page);

  await login(page, "developer@agentgate.dev");
  const developerApprovalAttempt = await page.evaluate(async (id) => {
    const response = await fetch(`/api/approvals/${id}/approve`, {
      body: JSON.stringify({ comment: "Developer should not approve." }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    return response.status;
  }, approvalRequestId);
  expect(developerApprovalAttempt).toBe(401);

  await logout(page);

  await login(page, "reviewer@agentgate.dev");
  await page.goto(`/approvals/${approvalRequestId}`);
  await expect(page.getByRole("heading", { name: /approval/i })).toBeVisible();
  await page
    .getByLabel("Review comment")
    .fill("Reviewer approval verified through browser E2E.");
  await page.getByRole("button", { name: "Approve" }).click();
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

  const approvedRecords = await page.evaluate(async (id) => {
    const response = await fetch(`/api/approvals/${id}`);
    const body = await response.json();

    return {
      ok: response.ok,
      approvalStatus: body.approval?.status as string | undefined,
      actionStatus: body.approval?.actionRequest?.status as string | undefined,
    };
  }, approvalRequestId);
  expect(approvedRecords).toMatchObject({
    ok: true,
    approvalStatus: approvalStatus.APPROVED,
    actionStatus: actionStatus.APPROVED,
  });
  await expect(page.getByText("Workspace error")).toHaveCount(0);
  await expect(page.locator("main").getByText("APPROVED").first()).toBeVisible();

  const alreadyApprovedAttempt = await page.evaluate(async (id) => {
    const response = await fetch(`/api/approvals/${id}/approve`, {
      body: JSON.stringify({ comment: "Second approval should be rejected safely." }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await response.json();

    return {
      status: response.status,
      error: body.error as string | undefined,
    };
  }, approvalRequestId);
  expect(alreadyApprovedAttempt).toMatchObject({
    status: 409,
    error: "Approval request is no longer pending review.",
  });

  const approvedActionAudit = await page.evaluate(async (id) => {
    const response = await fetch(`/api/actions/${id}`);
    const body = await response.json();

    return {
      ok: response.ok,
      status: body.action?.status as string | undefined,
      auditEvents: (body.auditLogs ?? []).map(
        (log: { eventType?: string }) => log.eventType,
      ) as string[],
    };
  }, actionRequestId);
  expect(approvedActionAudit.ok).toBe(true);
  expect(approvedActionAudit.status).toBe(actionStatus.APPROVED);
  expect(approvedActionAudit.auditEvents).toContain("approval.approved");

  const executeResponse = await request.post("/api/gateway/execute", {
    data: { actionRequestId },
    headers: {
      Authorization: `Bearer ${demoApiKey}`,
    },
  });
  expect(executeResponse.ok()).toBe(true);
  const executeBody = (await executeResponse.json()) as {
    actionRequestId?: string;
    executed?: boolean;
    status?: string;
  };
  expect(executeBody).toMatchObject({
    actionRequestId,
    executed: true,
    status: actionStatus.EXECUTED,
  });

  const executedActionAudit = await page.evaluate(async (id) => {
    const response = await fetch(`/api/actions/${id}`);
    const body = await response.json();

    return {
      ok: response.ok,
      status: body.action?.status as string | undefined,
      auditEvents: (body.auditLogs ?? []).map(
        (log: { eventType?: string }) => log.eventType,
      ) as string[],
    };
  }, actionRequestId);
  expect(executedActionAudit.ok).toBe(true);
  expect(executedActionAudit.status).toBe(actionStatus.EXECUTED);
  expect(executedActionAudit.auditEvents).toContain("gateway.action_executed");
});

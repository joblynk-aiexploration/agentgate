import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { ActionDecision, PrismaClient } from "../src/generated/prisma/client";

const commerceBaseUrl = process.env.COMMERCE_BASE_URL ?? "http://127.0.0.1:3004";
const agentGateBaseUrl = process.env.AGENTGATE_BASE_URL ?? "http://127.0.0.1:3001";
const demoCommerceApiKey =
  process.env.AGENTGATE_DEMO_COMMERCE_API_KEY ?? "ag_test_seed_demo_commerce_agent_key";
const demoCommerceAgentId =
  process.env.AGENTGATE_DEMO_COMMERCE_AGENT_ID ?? "demo-commerce-support-agent";
const commerceStoreFile = join(process.cwd(), "apps/demo-commerce-store/data/store.json");

type ChatResponse = {
  agentGateDecision?: {
    actionRequestId?: string;
    approvalRequestId?: string;
    decision?: string;
    riskLevel?: string;
  };
  intent: string;
  reply: string;
  status?: string;
};

type Check = {
  label: string;
  passed: boolean;
  detail?: string;
};

const checks: Check[] = [];

function record(label: string, passed: boolean, detail?: string) {
  checks.push({ detail, label, passed });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${label}${detail ? ` - ${detail}` : ""}`);
}

function cookieHeader(headers: Headers) {
  const cookie = headers.get("set-cookie");
  if (!cookie) {
    return "";
  }

  return cookie
    .split(/,\s*(?=[^=]+=)/)
    .map((part) => part.split(";")[0])
    .join("; ");
}

async function postForm(url: string, body: URLSearchParams, cookie?: string) {
  return fetch(url, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    method: "POST",
    redirect: "manual",
  });
}

async function getText(path: string, cookie?: string) {
  const response = await fetch(`${commerceBaseUrl}${path}`, {
    headers: cookie ? { Cookie: cookie } : undefined,
  });
  const text = await response.text();
  return { response, text };
}

async function configureAdmin() {
  const login = await postForm(
    `${commerceBaseUrl}/api/admin/login`,
    new URLSearchParams({
      email: "admin@northstar-demo.dev",
      password: "Password123!",
    }),
  );
  const adminCookie = cookieHeader(login.headers);
  record("commerce admin login works", login.status === 303 && Boolean(adminCookie));

  const save = await postForm(
    `${commerceBaseUrl}/api/admin/config`,
    new URLSearchParams({
      agentGateApiKey: demoCommerceApiKey,
      agentGateBaseUrl,
      agentId: demoCommerceAgentId,
      environment: "production",
    }),
    adminCookie,
  );
  record("commerce admin saved AgentGate config", save.status === 303);

  const safeConfig = await fetch(`${commerceBaseUrl}/api/admin/config`, {
    headers: { Cookie: adminCookie },
  });
  const safeConfigText = await safeConfig.text();
  record(
    "safe config exposes prefix only",
    safeConfigText.includes("ag_test_seed_demo") && !safeConfigText.includes(demoCommerceApiKey),
  );

  return adminCookie;
}

async function loginCustomer() {
  const login = await postForm(
    `${commerceBaseUrl}/api/customer/login`,
    new URLSearchParams({
      email: "customer@northstar-demo.dev",
      password: "Password123!",
      returnTo: "/account",
    }),
  );
  const customerCookie = cookieHeader(login.headers);
  record("customer login works", login.status === 303 && Boolean(customerCookie));
  return customerCookie;
}

async function createCheckoutOrder(customerCookie: string) {
  const accountBefore = await getText("/account/orders", customerCookie);
  record("customer starts with no orders after reset", accountBefore.text.includes("No orders yet"));

  const addBackpack = await postForm(
    `${commerceBaseUrl}/api/cart/add`,
    new URLSearchParams({ productId: "prod-backpack", quantity: "1" }),
    customerCookie,
  );
  const addJacket = await postForm(
    `${commerceBaseUrl}/api/cart/add`,
    new URLSearchParams({ productId: "prod-jacket", quantity: "1" }),
    customerCookie,
  );
  record("cart add works", addBackpack.status === 303 && addJacket.status === 303);

  const checkout = await postForm(
    `${commerceBaseUrl}/api/checkout`,
    new URLSearchParams({
      fullName: "Sarah Miller",
      addressLine1: "120 Trail Ridge Road",
      city: "Austin",
      state: "TX",
      zip: "78701",
      country: "US",
      cardholderName: "Sarah Miller",
      cardNumber: "4242 4242 4242 4242",
      expiry: "12/30",
      cvv: "123",
    }),
    customerCookie,
  );
  const location = checkout.headers.get("location") ?? "";
  const orderNumber = new URL(location, commerceBaseUrl).searchParams.get("order");
  record("checkout redirects to success with order number", checkout.status === 303 && Boolean(orderNumber), orderNumber ?? undefined);

  const success = await getText(`/checkout/success?order=${orderNumber}`, customerCookie);
  record("success page shows checkout order", success.response.ok && success.text.includes(orderNumber ?? ""));

  return orderNumber!;
}

async function chat(message: string, customerCookie: string): Promise<ChatResponse> {
  const response = await fetch(`${commerceBaseUrl}/api/agent/chat`, {
    body: JSON.stringify({
      message,
      sessionId: `verify-checkout-${Date.now()}`,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: customerCookie,
    },
    method: "POST",
  });
  const body = (await response.json()) as ChatResponse;
  if (!response.ok) {
    throw new Error(`Chat failed: ${response.status}`);
  }
  return body;
}

function readCommerceStore() {
  return JSON.parse(readFileSync(commerceStoreFile, "utf8")) as {
    agentLogs: Array<Record<string, unknown>>;
    orders: Array<{
      number: string;
      status: string;
      pendingApprovalRequestId?: string;
      createdThroughCheckout?: boolean;
    }>;
    users: Array<{ email: string }>;
  };
}

function hashApiKey(key: string) {
  if (!process.env.API_KEY_PEPPER) {
    return null;
  }

  return createHmac("sha256", process.env.API_KEY_PEPPER).update(key).digest("hex");
}

async function verifyAgentGateDb(actionIds: string[]) {
  if (!process.env.DATABASE_URL || !process.env.API_KEY_PEPPER) {
    record("AgentGate DB verification skipped", true, "DATABASE_URL or API_KEY_PEPPER missing");
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  try {
    const organization = await prisma.organization.findUnique({
      where: { slug: "acme" },
      select: { id: true },
    });
    record("AgentGate organization exists", Boolean(organization));

    if (!organization) {
      return;
    }

    const keyHash = hashApiKey(demoCommerceApiKey);
    const apiKey = await prisma.apiKey.findFirst({
      where: { keyHash: keyHash ?? "", organizationId: organization.id },
      select: { keyHash: true, keyPrefix: true, agent: { select: { slug: true } } },
    });
    record(
      "demo commerce API key is hashed and scoped",
      Boolean(apiKey) && apiKey?.keyHash !== demoCommerceApiKey && apiKey?.agent?.slug === demoCommerceAgentId,
      apiKey?.keyPrefix,
    );

    const actions = await prisma.actionRequest.findMany({
      where: { id: { in: actionIds }, organizationId: organization.id },
      include: { approvalRequest: true },
    });
    record("AgentGate action records were created", actions.length === actionIds.length, `count=${actions.length}`);

    const approvalAction = actions.find((action) => action.action === "order.cancel");
    record(
      "large checkout cancellation creates approval",
      approvalAction?.decision === ActionDecision.REQUIRE_APPROVAL && Boolean(approvalAction.approvalRequest),
      approvalAction?.approvalRequest?.id,
    );

    const auditCount = await prisma.auditLog.count({
      where: { organizationId: organization.id, targetId: { in: actionIds } },
    });
    record("AgentGate audit logs exist for checkout actions", auditCount >= actionIds.length);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("Northstar real checkout + AgentGate agent verification\n");
  console.log(`Commerce URL: ${commerceBaseUrl}`);
  console.log(`AgentGate URL: ${agentGateBaseUrl}`);

  const health = await fetch(`${agentGateBaseUrl}/api/health`).catch(() => null);
  const healthBody = health ? ((await health.json().catch(() => ({}))) as { ok?: boolean; database?: string }) : {};
  record("AgentGate health available", Boolean(health?.ok && healthBody.ok), `database=${healthBody.database ?? "unknown"}`);

  const home = await getText("/");
  record("commerce store loads", home.response.ok && home.text.includes("Northstar Outdoor Supply"));
  record("public pages do not expose full demo key", !home.text.includes(demoCommerceApiKey));

  const adminCookie = await configureAdmin();
  const customerCookie = await loginCustomer();
  const orderNumber = await createCheckoutOrder(customerCookie);

  const statusBefore = await chat("Where is my latest order?", customerCookie);
  record("agent finds real order after checkout", statusBefore.reply.includes(orderNumber));

  const cancel = await chat("Cancel my latest order.", customerCookie);
  record(
    "cancel latest order calls AgentGate and requires approval",
    cancel.intent === "cancel_order" &&
      cancel.agentGateDecision?.decision === ActionDecision.REQUIRE_APPROVAL &&
      Boolean(cancel.agentGateDecision.approvalRequestId),
    cancel.agentGateDecision?.actionRequestId,
  );

  const receipt = await chat("Can you resend my receipt for my latest order?", customerCookie);
  record(
    "receipt resend calls AgentGate",
    receipt.intent === "resend_receipt" && Boolean(receipt.agentGateDecision?.actionRequestId),
    String(receipt.agentGateDecision?.decision),
  );

  const deleteRequest = await chat("Delete my customer record.", customerCookie);
  record(
    "delete customer action is blocked/refused",
    deleteRequest.intent === "delete_customer_data" &&
      deleteRequest.agentGateDecision?.decision === ActionDecision.BLOCK,
    deleteRequest.agentGateDecision?.actionRequestId,
  );

  const store = readCommerceStore();
  const order = store.orders.find((item) => item.number === orderNumber);
  record("checkout-created order remains processing while approval pending", order?.status === "processing");
  record("order stores pending approval id", Boolean(order?.pendingApprovalRequestId), order?.pendingApprovalRequestId);
  record("customer data was not deleted", Boolean(store.users.find((user) => user.email === "customer@northstar-demo.dev")));
  record("agent logs include checkout flow", store.agentLogs.length >= 3, `count=${store.agentLogs.length}`);
  record("agent logs do not expose full demo key", !JSON.stringify(store.agentLogs).includes(demoCommerceApiKey));

  const adminLogs = await getText("/admin/agent-logs", adminCookie);
  record("admin logs page shows checkout order", adminLogs.text.includes(orderNumber));
  record("admin logs page does not expose full demo key", !adminLogs.text.includes(demoCommerceApiKey));

  const actionIds = [cancel, receipt, deleteRequest]
    .map((result) => result.agentGateDecision?.actionRequestId)
    .filter((id): id is string => Boolean(id));
  await verifyAgentGateDb(actionIds);

  const failed = checks.filter((check) => !check.passed);
  if (failed.length) {
    console.error(`\nVerification failed: ${failed.length} check(s).`);
    process.exit(1);
  }

  console.log("\nReal checkout commerce agent verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

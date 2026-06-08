import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  ActionDecision,
  ActionStatus,
  ApprovalStatus,
  PrismaClient,
} from "../src/generated/prisma/client";

const commerceBaseUrl =
  process.env.COMMERCE_BASE_URL ?? "http://127.0.0.1:3004";
const agentGateBaseUrl =
  process.env.AGENTGATE_BASE_URL ?? "http://127.0.0.1:3001";
const demoCommerceApiKey =
  process.env.AGENTGATE_DEMO_COMMERCE_API_KEY ??
  "ag_test_seed_demo_commerce_agent_key";
const demoCommerceAgentId =
  process.env.AGENTGATE_DEMO_COMMERCE_AGENT_ID ??
  "demo-commerce-support-agent";
const demoApiKeyPrefix = "ag_test_seed_demo";
const commerceStoreFile = join(
  process.cwd(),
  "apps/demo-commerce-store/data/store.json",
);

type AgentGateDecision = {
  actionRequestId?: string;
  approvalRequestId?: string;
  decision: ActionDecision | string;
  riskLevel?: string;
  riskScore?: number;
};

type ChatResponse = {
  agentGateDecision?: AgentGateDecision;
  intent: string;
  orderUpdate?: unknown;
  reply: string;
  status?: string;
};

type Check = {
  detail?: string;
  label: string;
  passed: boolean;
};

const checks: Check[] = [];

function record(label: string, passed: boolean, detail?: string) {
  checks.push({ detail, label, passed });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${label}${detail ? ` - ${detail}` : ""}`);
}

function requireEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for AgentGate DB verification.");
  }

  if (!process.env.API_KEY_PEPPER) {
    throw new Error("API_KEY_PEPPER is required for demo API key verification.");
  }
}

function getPrisma() {
  requireEnv();

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });
}

function hashApiKey(key: string) {
  return createHmac("sha256", process.env.API_KEY_PEPPER!)
    .update(key)
    .digest("hex");
}

function cookieHeader(headers: Headers) {
  const cookie = headers.get("set-cookie");

  if (!cookie) {
    return "";
  }

  return cookie
    .split(",")
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

async function postChat(message: string): Promise<ChatResponse> {
  const response = await fetch(`${commerceBaseUrl}/api/agent/chat`, {
    body: JSON.stringify({
      message,
      sessionId: `verify-commerce-${Date.now()}`,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const body = (await response.json()) as ChatResponse;

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return body;
}

async function getActionStatus(actionRequestId: string) {
  const response = await fetch(
    `${agentGateBaseUrl}/api/gateway/actions/${actionRequestId}`,
    {
      headers: {
        Authorization: `Bearer ${demoCommerceApiKey}`,
      },
    },
  );

  const body = (await response.json()) as {
    actionRequestId?: string;
    decision?: ActionDecision;
    status?: ActionStatus;
  };

  if (!response.ok) {
    throw new Error(`AgentGate status check failed: ${response.status}`);
  }

  return body;
}

function readCommerceStore() {
  return JSON.parse(readFileSync(commerceStoreFile, "utf8")) as {
    agentLogs: Array<Record<string, unknown>>;
    customers: Array<{ email: string }>;
    orders: Array<{ number: string; status: string }>;
  };
}

function assertNoSecret(label: string, value: string) {
  record(label, !value.includes(demoCommerceApiKey));
}

async function configureCommerceAdmin() {
  const login = await postForm(
    `${commerceBaseUrl}/api/admin/login`,
    new URLSearchParams({
      email: "admin@northstar-demo.dev",
      password: "Password123!",
    }),
  );
  const cookie = cookieHeader(login.headers);
  record("admin login works", login.status === 303 && Boolean(cookie));

  const save = await postForm(
    `${commerceBaseUrl}/api/admin/config`,
    new URLSearchParams({
      agentGateApiKey: demoCommerceApiKey,
      agentGateBaseUrl,
      agentId: demoCommerceAgentId,
      environment: "production",
    }),
    cookie,
  );
  record("admin API config saves", save.status === 303);

  const config = await fetch(`${commerceBaseUrl}/api/admin/config`, {
    headers: { Cookie: cookie },
  });
  const safeConfig = await config.text();
  record(
    "admin config safe view shows prefix only",
    safeConfig.includes(demoApiKeyPrefix) && !safeConfig.includes(demoCommerceApiKey),
  );

  const test = await postForm(
    `${commerceBaseUrl}/api/admin/config/test`,
    new URLSearchParams(),
    cookie,
  );
  record("admin AgentGate sandbox test works", test.status === 303);

  return cookie;
}

async function verifyDb(prisma: PrismaClient, decisions: AgentGateDecision[]) {
  const organization = await prisma.organization.findUnique({
    where: { slug: "acme" },
    select: { id: true },
  });

  if (!organization) {
    record("AgentGate organization exists", false);
    return;
  }

  const keyHash = hashApiKey(demoCommerceApiKey);
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      organizationId: organization.id,
    },
    select: {
      agent: { select: { slug: true } },
      keyHash: true,
      keyPrefix: true,
    },
  });

  record(
    "commerce demo API key exists hashed and scoped",
    Boolean(apiKey) &&
      apiKey?.keyHash === keyHash &&
      apiKey?.keyHash !== demoCommerceApiKey &&
      apiKey?.agent?.slug === demoCommerceAgentId,
    apiKey ? `prefix=${apiKey.keyPrefix}, agent=${apiKey.agent?.slug}` : undefined,
  );

  const ids = decisions
    .map((decision) => decision.actionRequestId)
    .filter((id): id is string => Boolean(id));

  const actions = await prisma.actionRequest.findMany({
    where: {
      id: { in: ids },
      organizationId: organization.id,
    },
    include: {
      approvalRequest: true,
    },
  });

  record("AgentGate action records exist", actions.length === ids.length, `count=${actions.length}`);

  const approvalAction = actions.find((action) => action.action === "order.cancel" && action.decision === ActionDecision.REQUIRE_APPROVAL);
  record(
    "large cancellation approval exists",
    approvalAction?.approvalRequest?.status === ApprovalStatus.PENDING,
    approvalAction?.approvalRequest?.id,
  );

  const blockedAction = actions.find((action) => action.action === "order.cancel" && action.decision === ActionDecision.BLOCK);
  record(
    "shipped cancellation is blocked in AgentGate",
    blockedAction?.status === ActionStatus.BLOCKED,
    blockedAction?.reason ?? undefined,
  );

  const deleteAction = actions.find((action) => action.action === "customer.delete");
  record(
    "customer delete action blocked",
    deleteAction?.decision === ActionDecision.BLOCK &&
      deleteAction.status === ActionStatus.BLOCKED,
    deleteAction?.reason ?? undefined,
  );

  const auditCount = await prisma.auditLog.count({
    where: {
      organizationId: organization.id,
      targetId: {
        in: ids,
      },
      eventType: {
        in: ["gateway.action_checked", "approval.requested", "action.blocked"],
      },
    },
  });
  record("AgentGate audit logs created for commerce actions", auditCount >= ids.length);
}

async function main() {
  console.log("AgentGate commerce integration verification\n");
  console.log(`Commerce URL: ${commerceBaseUrl}`);
  console.log(`AgentGate URL: ${agentGateBaseUrl}`);
  console.log(`Demo key prefix: ${demoApiKeyPrefix}`);

  const health = await fetch(`${agentGateBaseUrl}/api/health`);
  const healthBody = (await health.json()) as { database?: string; ok?: boolean };
  record(
    "AgentGate health is available",
    health.ok && healthBody.ok === true && healthBody.database === "connected",
    `database=${healthBody.database}`,
  );

  const home = await getText("/");
  record(
    "commerce store loads",
    home.response.ok && home.text.includes("Northstar Outdoor Supply"),
  );
  record("products visible on store home", home.text.includes("SummitPro Backpack"));
  record("chat widget rendered", home.text.includes("Open Northstar Assistant"));
  assertNoSecret("public home does not expose full API key", home.text);

  const adminCookie = await configureCommerceAdmin();

  const product = await postChat("What backpacks do you sell?");
  record(
    "product question answered from catalog",
    product.intent === "product_question" && product.reply.includes("SummitPro Backpack"),
  );

  const largeCancel = await postChat(
    "Cancel my order NS-1002. My email is sarah@example.com.",
  );
  record(
    "large cancellation requires approval",
    largeCancel.intent === "cancel_order" &&
      largeCancel.agentGateDecision?.decision === ActionDecision.REQUIRE_APPROVAL &&
      Boolean(largeCancel.agentGateDecision.approvalRequestId),
    largeCancel.agentGateDecision?.actionRequestId,
  );

  const shippedCancel = await postChat(
    "Cancel my order NS-1003. My email is sarah@example.com.",
  );
  record(
    "shipped cancellation blocked or safely refused",
    shippedCancel.intent === "cancel_order" &&
      shippedCancel.agentGateDecision?.decision === ActionDecision.BLOCK,
    shippedCancel.agentGateDecision?.actionRequestId,
  );

  const receipt = await postChat(
    "Please resend my receipt for NS-1001 to sarah@example.com.",
  );
  record(
    "receipt resend calls AgentGate",
    receipt.intent === "resend_receipt" &&
      Boolean(receipt.agentGateDecision?.actionRequestId) &&
      ["ALLOW", "LOG_ONLY", "REQUIRE_APPROVAL"].includes(
        String(receipt.agentGateDecision?.decision),
      ),
    String(receipt.agentGateDecision?.decision),
  );

  const returnRequest = await postChat(
    "I want to return order NS-1004. My email is omar@example.com.",
  );
  record(
    "return request calls AgentGate",
    returnRequest.intent === "return_request" &&
      Boolean(returnRequest.agentGateDecision?.actionRequestId),
    String(returnRequest.agentGateDecision?.decision),
  );

  const deleteRequest = await postChat(
    "Delete my customer record. My email is sarah@example.com.",
  );
  record(
    "customer data deletion blocked or safely refused",
    deleteRequest.intent === "delete_customer_data" &&
      deleteRequest.agentGateDecision?.decision === ActionDecision.BLOCK,
    deleteRequest.agentGateDecision?.actionRequestId,
  );

  const store = readCommerceStore();
  const shippedOrder = store.orders.find((order) => order.number === "NS-1003");
  const sarah = store.customers.find((customer) => customer.email === "sarah@example.com");
  record(
    "shipped order was not cancelled locally",
    shippedOrder?.status === "shipped",
    `status=${shippedOrder?.status}`,
  );
  record("customer data was not deleted", Boolean(sarah));
  record("admin agent logs were created", store.agentLogs.length >= 5, `count=${store.agentLogs.length}`);
  assertNoSecret("local agent logs do not expose full API key", JSON.stringify(store.agentLogs));

  const adminLogs = await getText("/admin/agent-logs", adminCookie);
  const largeCancelActionRequestId =
    largeCancel.agentGateDecision?.actionRequestId;
  record("admin logs page loads", adminLogs.response.ok);
  assertNoSecret("admin logs page does not expose full API key", adminLogs.text);
  record(
    "admin logs show action IDs",
    Boolean(largeCancelActionRequestId) &&
      adminLogs.text.includes(largeCancelActionRequestId ?? ""),
  );

  const statuses = await Promise.all(
    [
      largeCancel.agentGateDecision,
      shippedCancel.agentGateDecision,
      receipt.agentGateDecision,
      returnRequest.agentGateDecision,
      deleteRequest.agentGateDecision,
    ]
      .filter((decision): decision is AgentGateDecision => Boolean(decision?.actionRequestId))
      .map((decision) => getActionStatus(decision.actionRequestId!)),
  );
  record("AgentGate action status endpoint sees commerce actions", statuses.length >= 5);

  const prisma = getPrisma();
  try {
    await verifyDb(prisma, [
      largeCancel.agentGateDecision!,
      shippedCancel.agentGateDecision!,
      receipt.agentGateDecision!,
      returnRequest.agentGateDecision!,
      deleteRequest.agentGateDecision!,
    ]);
  } finally {
    await prisma.$disconnect();
  }

  const failed = checks.filter((check) => !check.passed);

  if (failed.length > 0) {
    console.error(`\nCommerce integration verification failed: ${failed.length} check(s).`);
    process.exit(1);
  }

  console.log("\nCommerce integration verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

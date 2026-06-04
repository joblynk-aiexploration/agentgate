const appUrl = process.env.APP_URL;
const demoApiKey = process.env.AGENTGATE_DEMO_API_KEY;

const refundPayload = {
  agentId: "support-refund-agent",
  tool: "stripe",
  action: "refund.create",
  environment: "production",
  amount: 1200,
  currency: "USD",
  reason: "Customer was double charged",
  payload: {
    customerId: "cus_demo",
  },
  metadata: {
    customerTier: "standard",
  },
};

const pausedAgentPayload = {
  agentId: "database-maintenance-agent",
  tool: "postgres",
  action: "query.write",
  environment: "production",
  reason: "Update customer row",
  payload: {
    statementType: "UPDATE",
    table: "customers",
  },
  metadata: {},
};

function printCurlExamples() {
  const baseUrl = appUrl ?? "http://localhost:3000";

  console.log("Gateway curl examples:");
  console.log(`
curl -X POST "${baseUrl}/api/gateway/check" \\
  -H "Authorization: Bearer <ag_test_api_key>" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: demo-refund-1200" \\
  -d '${JSON.stringify(refundPayload)}'
`);
  console.log(`
curl -X POST "${baseUrl}/api/gateway/execute" \\
  -H "Authorization: Bearer <ag_test_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{"actionRequestId":"<action_request_id>"}'
`);
  console.log(`
curl -X POST "${baseUrl}/api/gateway/cancel" \\
  -H "Authorization: Bearer <ag_test_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{"actionRequestId":"<action_request_id>"}'
`);
}

async function postGatewayCheck(payload: unknown, idempotencyKey: string) {
  if (!appUrl || !demoApiKey) {
    throw new Error("APP_URL and AGENTGATE_DEMO_API_KEY are required for live verification.");
  }

  const response = await fetch(`${appUrl}/api/gateway/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${demoApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Gateway check failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body as { decision: string; reason: string };
}

async function main() {
  printCurlExamples();

  if (!appUrl || !demoApiKey) {
    console.log(
      "Skipping live gateway verification because APP_URL and AGENTGATE_DEMO_API_KEY are not both set.",
    );
    return;
  }

  const refund = await postGatewayCheck(refundPayload, "verify-refund-1200");

  if (refund.decision !== "REQUIRE_APPROVAL") {
    throw new Error(`Expected refund decision REQUIRE_APPROVAL, got ${refund.decision}`);
  }

  const paused = await postGatewayCheck(pausedAgentPayload, "verify-paused-agent");

  if (paused.decision !== "BLOCK") {
    throw new Error(`Expected paused agent decision BLOCK, got ${paused.decision}`);
  }

  console.log("Gateway live verification passed.");
  console.log({ paused, refund });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

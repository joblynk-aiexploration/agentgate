import {
  BookOpen,
  Braces,
  ClipboardCheck,
  FileJson,
  KeyRound,
  Route,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { roleRules, requireRole } from "@/lib/permissions";

const curlExample = `curl -X POST http://localhost:3000/api/gateway/check \\
  -H "Authorization: Bearer <ag_test_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "support-refund-agent",
    "tool": "stripe",
    "action": "refund.create",
    "environment": "production",
    "amount": 1200,
    "currency": "USD",
    "reason": "Customer was double charged",
    "payload": {},
    "metadata": {}
  }'`;

const executeCurlExample = `curl -X POST http://localhost:3000/api/gateway/execute \\
  -H "Authorization: Bearer <ag_test_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "actionRequestId": "<allowed_or_approved_action_request_id>"
  }'`;

const toolProxyCurlExample = `curl -X POST http://localhost:3000/api/tool-proxy/slack/message.send \\
  -H "Authorization: Bearer <ag_test_api_key>" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: slack-proxy-demo-001" \\
  -d '{
    "agentId": "support-refund-agent",
    "environment": "internal",
    "reason": "Notify the support team about a completed demo workflow",
    "payload": {
      "channel": "#support-demo",
      "text": "Refund review is ready."
    },
    "metadata": {
      "source": "tool-proxy-demo"
    }
  }'`;

const webhookCurlExample = `curl -X POST http://localhost:3000/api/gateway/check \\
  -H "Authorization: Bearer <ag_test_api_key>" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: webhook-demo-001" \\
  -d '{
    "agentId": "support-refund-agent",
    "tool": "webhook",
    "action": "webhook.trigger",
    "environment": "production",
    "reason": "Notify an internal workflow after approval",
    "payload": {
      "event": "refund.approved",
      "target": "demo-workflow",
      "body": {
        "action": "refund.create",
        "amount": 1200,
        "currency": "USD"
      }
    },
    "metadata": {
      "source": "agentgate-demo"
    }
  }'`;

const typescriptExample = `type GatewayDecision =
  | "ALLOW"
  | "REQUIRE_APPROVAL"
  | "BLOCK"
  | "LOG_ONLY"
  | "SANDBOX_ONLY";

async function checkRefund(apiKey: string) {
  const response = await fetch("http://localhost:3000/api/gateway/check", {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
      "Idempotency-Key": "refund-1200-demo",
    },
    body: JSON.stringify({
      agentId: "support-refund-agent",
      tool: "stripe",
      action: "refund.create",
      environment: "production",
      amount: 1200,
      currency: "USD",
      reason: "Customer was double charged",
      payload: {},
      metadata: {},
    }),
  });

  if (!response.ok) {
    throw new Error(\`Gateway check failed: \${response.status}\`);
  }

  const result = (await response.json()) as {
    actionRequestId: string;
    decision: GatewayDecision;
    allowed: boolean;
    requiresApproval: boolean;
    approvalRequestId?: string;
    status: string;
  };

  return result;
}`;

const sdkStarterExample = `import { AgentGateClient } from "@/sdk";

const agentgate = new AgentGateClient({
  apiKey: process.env.AGENTGATE_API_KEY!,
  baseUrl: "http://localhost:3000",
});

const decision = await agentgate.check({
  agentId: "support-refund-agent",
  tool: "stripe",
  action: "refund.create",
  environment: "production",
  amount: 1200,
  currency: "USD",
  reason: "Customer was double charged",
});

if (decision.requiresApproval) {
  console.log("Approval required", decision.approvalRequestId);
} else if (decision.allowed) {
  await agentgate.execute(decision.actionRequestId);
}`;

const webhookCallbackPayloadExample = `{
  "event": "approval.requested",
  "organizationId": "org_...",
  "timestamp": "2026-06-05T00:00:00.000Z",
  "targetType": "ApprovalRequest",
  "targetId": "apr_...",
  "metadata": {
    "summary": "actionRequestId: act_..., riskLevel: HIGH"
  }
}`;

const decisionRows = [
  {
    decision: "ALLOW",
    detail: "The action can proceed to simulated execution without approval.",
  },
  {
    decision: "REQUIRE_APPROVAL",
    detail: "The action is held in the Approval Inbox until an eligible reviewer approves or rejects it.",
  },
  {
    decision: "BLOCK",
    detail: "The action must not execute. Paused agents, kill switch, and blocking policies return this.",
  },
  {
    decision: "LOG_ONLY",
    detail: "The action is allowed, but AgentGate still records the full audit trail.",
  },
  {
    decision: "SANDBOX_ONLY",
    detail: "V1 allows this only for non-production or sandbox-style environments; production requests are blocked.",
  },
] as const;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto bg-[#111318] p-4 text-xs leading-6 text-[#d8eeee]">
      <code>{children}</code>
    </pre>
  );
}

export default async function DeveloperDocsPage() {
  const membership = await requireRole(roleRules.viewDeveloperDocs);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/developer/api-keys" variant="secondary">
              <KeyRound className="h-4 w-4" aria-hidden />
              API keys
            </Button>
            <Button href="/developer/webhooks" variant="secondary">
              <Webhook className="h-4 w-4" aria-hidden />
              Webhooks
            </Button>
            <Button href="/api/openapi" variant="secondary">
              <FileJson className="h-4 w-4" aria-hidden />
              OpenAPI
            </Button>
            <Button href="/developer">
              <Route className="h-4 w-4" aria-hidden />
              Developer home
            </Button>
          </div>
        }
        description="Integrate agents with the AgentGate gateway, local safety engine, policy decisions, approvals, and audit logs."
        eyebrow={membership.organization.slug}
        title="Developer Docs"
      />

      <Card>
        <CardHeader>
          <CardTitle>What AgentGate Does</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-[#34404a]">
          <p>
            AgentGate is the safety, approval, and audit layer for AI agents. Agents call the
            gateway before taking sensitive actions, and AgentGate decides whether to allow,
            block, log, or route the action for human approval.
          </p>
          <div className="border border-[#d9dee8] bg-[#f8fafc] p-4 font-semibold text-[#172326]">
            AI Agent &rarr; AgentGate Gateway API &rarr; Local Safety Engine &rarr; Policy
            Decision &rarr; Approval Inbox &rarr; Audit Log
          </div>
          <p>
            AgentGate V1 uses deterministic local TypeScript rules only. It does not use
            OpenAI, Anthropic, Gemini, or paid AI APIs.
          </p>
          <div className="grid gap-3 border border-[#d9dee8] bg-white p-4 md:grid-cols-3">
            <div>
              <p className="font-semibold text-[#172326]">1. Register</p>
              <p className="mt-1 text-[#5c6470]">Create an agent and choose allowed demo tools.</p>
            </div>
            <div>
              <p className="font-semibold text-[#172326]">2. Check</p>
              <p className="mt-1 text-[#5c6470]">Send a gateway request with an `ag_test_` API key.</p>
            </div>
            <div>
              <p className="font-semibold text-[#172326]">3. Decide</p>
              <p className="mt-1 text-[#5c6470]">Handle ALLOW, REQUIRE_APPROVAL, or BLOCK before execute.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Setup Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm leading-6 text-[#34404a]">
              <li>1. Register an agent from the Agent Registry and assign allowed tools.</li>
              <li>2. Create an API key from Developer &gt; API Keys.</li>
              <li>
                3. Copy the full <code className="font-mono">ag_test_</code> key immediately.
                It is shown once.
              </li>
              <li>
                4. Send gateway checks with{" "}
                <code className="font-mono">Authorization: Bearer &lt;ag_test_api_key&gt;</code>.
              </li>
              <li>5. Handle the decision response before calling execute or cancel.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gateway Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="font-semibold">POST /api/gateway/check</dt>
                <dd className="mt-1 text-[#5c6470]">
                  Authenticates the API key, resolves the agent, scores risk, evaluates policies,
                  creates approval requests when needed, and writes audit logs.
                  If you send an <code className="font-mono">Idempotency-Key</code>,
                  reuse it only for the exact same request body. AgentGate rejects
                  mismatched replays to avoid returning a prior decision for a
                  different action.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">POST /api/gateway/execute</dt>
                <dd className="mt-1 text-[#5c6470]">
                  Simulates execution only after the action is allowed or approved. V1 chooses a
                  demo executor by tool and never calls Stripe, email providers, Slack, databases,
                  webhooks, or external tools.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">POST /api/gateway/cancel</dt>
                <dd className="mt-1 text-[#5c6470]">
                  Cancels pending actions and any pending approval request for the same organization.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">POST /api/tool-proxy/[tool]/[action]</dt>
                <dd className="mt-1 text-[#5c6470]">
                  V1 Tool Proxy mode accepts a demo tool call, runs the same
                  gateway check first, then either blocks, creates approval, or
                  simulates execution for immediately allowed demo actions. It
                  never calls real Stripe, email, Slack, database, webhook, or
                  external systems.
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check API Mode vs Tool Proxy Mode</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-[#34404a]">
          <p>
            Use Check API mode when your agent or application wants a decision
            first and will call execute later after approval. Use Tool Proxy mode
            when a demo agent wants to call a simulated tool through AgentGate in
            one request.
          </p>
          <p>
            Tool Proxy mode still creates the same Action Request, Risk
            Assessment, Approval Request when needed, and Audit Log trail as the
            gateway check endpoint. Only immediately allowed or log-only actions
            receive a simulated execution result.
          </p>
          <CodeBlock>{toolProxyCurlExample}</CodeBlock>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OpenAPI Specification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-[#34404a]">
          <p>
            AgentGate exposes a JSON OpenAPI 3.1 document for the public gateway
            and developer APIs. It documents gateway checks, simulated execution,
            API keys, agents, approvals, audit logs, and settings without
            exposing secrets or internal-only schemas.
          </p>
          <div>
            <Button href="/api/openapi" variant="secondary">
              <FileJson className="h-4 w-4" aria-hidden />
              View /api/openapi
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TypeScript Fetch Example</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock>{typescriptExample}</CodeBlock>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SDK Starter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-[#34404a]">
            `src/sdk` contains a local TypeScript SDK starter for Node 18+ agents.
            It is not published to npm yet and does not call paid AI APIs.
          </p>
          <CodeBlock>{sdkStarterExample}</CodeBlock>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outbound Webhook Callbacks</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-[#34404a]">
          <p>
            Developer &gt; Webhooks lets org owners and developers configure
            callback endpoints for gateway decisions, blocked actions, approval
            requests, approval decisions, simulated executions, agent pauses, and
            organization kill-switch events. Security admins can view and disable
            endpoints; auditors can view only.
          </p>
          <p>
            V1 stores endpoint configuration and simulates test deliveries by
            default. Real external delivery is disabled unless a deployment
            explicitly opts in with{" "}
            <code className="font-mono">AGENTGATE_ENABLE_OUTBOUND_WEBHOOKS=true</code>.
            When enabled, AgentGate uses a short timeout and sends no secrets in
            the payload.
          </p>
          <CodeBlock>{webhookCallbackPayloadExample}</CodeBlock>
          <p>
            If a signing secret is configured, AgentGate stores only a hash and
            includes an <code className="font-mono">X-AgentGate-Signature</code>{" "}
            HMAC value on outbound attempts.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>curl Example</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock>{curlExample}</CodeBlock>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execute curl Example</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <CodeBlock>{executeCurlExample}</CodeBlock>
          <p className="text-sm leading-6 text-[#34404a]">
            Execute returns a safe simulated result. Stripe refunds, emails, Slack messages,
            database writes, and webhook deliveries are not performed in V1.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Demo Example</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-[#34404a]">
            The Webhook Demo integration supports `webhook.trigger`,
            `webhook.notify`, and `webhook.enqueue`. Production webhook actions
            are scored at least MEDIUM risk by local rules, and execute returns a
            fake delivery id without calling any external URL.
          </p>
          <CodeBlock>{webhookCurlExample}</CodeBlock>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision Handling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {decisionRows.map((row) => (
              <div
                className="grid gap-2 border border-[#d9dee8] bg-[#f8fafc] p-4 md:grid-cols-[180px_1fr]"
                key={row.decision}
              >
                <div>
                  <StatusBadge status={row.decision} />
                </div>
                <p className="text-sm leading-6 text-[#34404a]">{row.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Approval Flow</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-[#34404a]">
            A `REQUIRE_APPROVAL` decision creates an Approval Inbox item. Eligible reviewers can
            inspect risk signals, payload JSON, metadata, policy reason, and audit history before
            approving, rejecting, or saving an edited payload.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SDK Starter</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-[#34404a]">
            A repo-local TypeScript SDK starter is available in `src/sdk` with typed
            `check`, `execute`, and `cancel` methods. Publishing as a package is a
            future roadmap item.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Webhook Callbacks</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-[#34404a]">
            Configure outbound callback endpoints from Developer &gt; Webhooks.
            V1 simulates delivery by default and supports opt-in external sends
            with signed payloads.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Future MCP Gateway</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start gap-3 text-sm leading-6 text-[#34404a]">
          <Braces className="mt-0.5 h-4 w-4 shrink-0 text-[#2d6f7f]" aria-hidden />
          <p>
            Future versions can act as a richer MCP gateway. V1 Tool Proxy mode
            keeps execution simulated so policies, approvals, and audit trails
            can be demonstrated without real third-party side effects.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button href="/agents" variant="secondary">
            Register agent
          </Button>
          <Button href="/developer/api-keys" variant="secondary">
            Create API key
          </Button>
          <Button href="/approvals" variant="secondary">
            <ClipboardCheck className="h-4 w-4" aria-hidden />
            Approval Inbox
          </Button>
          <Button href="/audit-logs" variant="secondary">
            <BookOpen className="h-4 w-4" aria-hidden />
            Audit Logs
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

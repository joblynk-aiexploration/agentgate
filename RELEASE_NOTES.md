# AgentGate V1 Release Candidate

AgentGate V1 is a local-first SaaS demo for governing AI agent actions before
they reach business tools. It demonstrates the safety, approval, and audit layer
for AI agents using deterministic TypeScript rules and simulated integrations.

## What AgentGate V1 Does

- Provides email/password human login with httpOnly session cookies.
- Supports organizations, memberships, and role-based authorization.
- Registers AI agents with departments, owners, allowed tools, status, and risk tier.
- Creates hashed `ag_test_` API keys for gateway access.
- Authenticates gateway requests with API keys, not human login sessions.
- Scores actions with a local rules-based risk engine.
- Evaluates organization policies and returns `ALLOW`, `REQUIRE_APPROVAL`, `BLOCK`, `LOG_ONLY`, or `SANDBOX_ONLY`.
- Creates approval requests for actions that require human review.
- Records audit logs for important authentication, gateway, approval, policy, API key, agent, and kill-switch events.
- Provides dashboard, approval inbox, audit logs, reports, developer docs, OpenAPI, and CSV exports.

## What Is Working

- Fresh local setup with Docker Postgres, Prisma migrations, and idempotent demo seed.
- Seed users:
  - `owner@agentgate.dev / Password123!`
  - `reviewer@agentgate.dev / Password123!`
  - `auditor@agentgate.dev / Password123!`
- Seeded local demo API key:
  - `ag_test_seed_support_refund_demo_key`
- Demo gateway flow:
  - Support Refund Agent requests a `$1,200` production refund.
  - Risk engine scores it high risk.
  - Refund policy requires approval above `$500`.
  - Approval appears in the Approval Inbox.
  - Reviewer can approve or reject.
  - Audit logs show the trail.
  - Pausing the agent makes the same request return `BLOCK`.
  - Enabling the organization kill switch also makes gateway requests return `BLOCK`.
- API keys are hashed before storage and the full key is shown only once after creation.
- Organization-owned queries reviewed for tenant scoping with `organizationId`.
- Demo verification scripts pass against local Postgres.

## What Is Intentionally Simulated

V1 does not perform real external side effects.

- No real Stripe refunds.
- No real emails.
- No real Slack messages.
- No real database writes.
- No real webhook deliveries.
- No live billing.
- No OpenAI, Anthropic, Gemini, or paid AI APIs.
- No real AI model training.
- No SOC 2 claim.

All execution adapters return safe simulated results for demo purposes only.

## How To Run The Demo

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000/login` and sign in with:

```text
owner@agentgate.dev / Password123!
reviewer@agentgate.dev / Password123!
```

Test the gateway:

```bash
curl -X POST http://localhost:3000/api/gateway/check \
  -H "Authorization: Bearer ag_test_seed_support_refund_demo_key" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "support-refund-agent",
    "tool": "stripe",
    "action": "refund.create",
    "environment": "production",
    "amount": 1200,
    "currency": "USD",
    "reason": "Customer was double charged"
  }'
```

Expected result: `REQUIRE_APPROVAL` and a pending approval in `/approvals`.

## Known Limitations

- V1 uses local deterministic rules only.
- Integrations are demo/simulated adapters, not production connectors.
- In-memory gateway rate limiting is not distributed and is suitable only as a V1 placeholder.
- Approval assignment and escalation are lightweight.
- Reporting is useful for demo/compliance review but not a full analytics product.
- Billing is display-only.
- The seeded demo API key is local-only and must not be used in production.
- Production deployments should create real organizations and users through onboarding or a controlled admin process instead of seeding demo data.

## Next Roadmap

- Policy templates and richer condition builder.
- Stronger approval assignment, escalation, and reviewer workflows.
- Production-grade distributed rate limiting.
- Webhook notifications for approval and audit events.
- Real integration adapters behind strict sandboxing and explicit configuration.
- SSO and enterprise identity.
- SDK packaging and versioned public API docs.
- Optional local model reviewer mode.

# AgentGate

[![CI](https://github.com/joblynk-aiexploration/agentgate/actions/workflows/ci.yml/badge.svg)](https://github.com/joblynk-aiexploration/agentgate/actions/workflows/ci.yml)

AgentGate is an enterprise-grade multi-tenant SaaS demo: the safety, approval, and audit layer for AI agents.

One-line pitch: AgentGate lets AI agents request sensitive actions through a governed gateway before anything is approved, blocked, simulated, or audited.

V1 is intentionally honest demo software: risk scoring is local TypeScript, policy
decisions are deterministic, integrations are simulated, and no paid AI APIs or
real business-tool side effects are required.

For a non-technical walkthrough, see the [AgentGate User Manual](docs/user-manual.md).

## Visual Demo Screenshots

If you cannot access the local dev server directly, review the generated
screenshots and walkthrough in [docs/visual-demo.md](docs/visual-demo.md).
For the enterprise UI polish pass, see [docs/ui-polish-review.md](docs/ui-polish-review.md).

Founder demo package:

- [Live demo script](docs/demo-script.md)
- [Founder notes](docs/founder-notes.md)
- [Customer discovery questions](docs/customer-discovery-questions.md)
- [Product positioning](docs/product-positioning.md)

QA and readiness:

- [Master QA report](docs/qa/MASTER_QA_REPORT.md)
- [Full QA run](docs/qa/full-qa-run.md)
- [AgentGate and ecommerce integration report](docs/qa/full-agentgate-ecommerce-integration-report.md)
- [Security QA report](docs/qa/security-qa-report.md)

## Quick Start

Run these commands from a fresh clone:

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Start PostgreSQL with Docker:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
npm install
```

4. Run Prisma migrations:

```bash
npm run prisma:migrate
```

5. Seed the demo database:

```bash
npm run prisma:seed
```

The seed is safe to rerun for local demos. It resets the `acme` demo organization,
recreates demo users, creates pending approvals, writes audit logs, and stores only
the hash of the local demo API key.

6. Start the dev server:

```bash
npm run dev
```

7. Login at `http://localhost:3000/login`:

```text
owner@agentgate.dev / Password123!
reviewer@agentgate.dev / Password123!
platform@agentgate.dev / Password123!
```

8. Test the gateway:

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

Expected: `REQUIRE_APPROVAL` with a pending approval in `/approvals`.

## Demo Ecommerce Store on localhost:3004

AgentGate includes a separate local ecommerce demo site, Northstar Outdoor Supply, for
testing an embedded support agent on another website.

Run AgentGate on `http://localhost:3001`:

```bash
npm run dev -- -p 3001
```

Then run the commerce app on `http://localhost:3004`:

```bash
npm run commerce:install
npm run commerce:seed
npm run commerce:dev
```

Commerce admin login:

```text
admin@northstar-demo.dev / Password123!
```

Northstar is preconfigured for the local AgentGate demo after
`npm run commerce:reset`. Open `http://localhost:3004/admin/api` to verify or
change the connection:

- AgentGate Base URL: `http://127.0.0.1:3001`
- AgentGate API key: `ag_test_seed_demo_commerce_agent_key`
- Agent ID: `demo-commerce-support-agent`
- Environment: `production`

The commerce app stores the full API key only in ignored local server config and
shows only a prefix after save. The customer browser never receives the key.

Customer login:

```text
customer@northstar-demo.dev / Password123!
```

After `npm run commerce:reset`, this account starts with no active orders. Add
products to the cart, complete the demo checkout, then try the storefront chat
widget:

```text
Where is my latest order?
Cancel my latest order.
Can you resend my receipt for my latest order?
Delete my customer record.
```

Expected AgentGate results:

- High-value checkout order cancellation returns `REQUIRE_APPROVAL`.
- Receipt resend is checked through AgentGate and simulated only when allowed or logged.
- `/admin/agent-logs` shows decision, risk, action request ID, and approval ID.
- After a reviewer approves the `order.cancel` approval in AgentGate, Northstar
  admin can open `/admin/orders` and click `Sync approved AgentGate actions` to
  safely execute the simulated cancellation. The order should become
  `Cancelled`, and AgentGate should show `approval.approved` plus
  `gateway.action_executed` audit events.

See [apps/demo-commerce-store/README.md](apps/demo-commerce-store/README.md).
The redesigned ecommerce UI audit and screenshot notes live in
[apps/demo-commerce-store/docs/ui-audit.md](apps/demo-commerce-store/docs/ui-audit.md)
and [apps/demo-commerce-store/docs/ui-polish-review.md](apps/demo-commerce-store/docs/ui-polish-review.md).

### Ecommerce AgentGate Integration Test

After AgentGate is running on `3001` and the commerce store is running on `3004`,
run the live verification script:

```bash
npm run verify:commerce-checkout-agent
```

The script logs in to the commerce admin, saves the AgentGate connection through
the real admin API route, confirms the browser-safe config only exposes
`ag_test_seed_demo`, logs in as the customer, creates a real local checkout order,
runs customer chat scenarios, verifies approval/audit records in Prisma when
available, and scans rendered/admin surfaces for the full local-only API key. The
script does not execute real Stripe, Gmail, Slack, Postgres, or webhook actions.

### Testing the Ecommerce Agent with an AgentGate API Key

This flow proves the manual bridge from AgentGate API key creation to the
Northstar support agent. It is local-only and does not use paid AI APIs or real
business integrations.

Start the local apps:

```bash
docker start agentgate-postgres || true
npm run demo:reset
npm run demo:check
npm run commerce:reset
npm run dev -- -p 3001
npm run commerce:dev
```

In AgentGate:

1. Open `http://localhost:3001/login`.
2. Log in with `owner@agentgate.dev` / `Password123!`.
3. Open `http://localhost:3001/developer/api-keys`.
4. Create an API key named `Northstar Commerce Test Key`.
5. Scope it to `Demo Commerce Support Agent`.
6. Copy the full key from the one-time reveal only.

In Northstar:

1. Open `http://localhost:3004/admin/login`.
2. Log in with `admin@northstar-demo.dev` / `Password123!`.
3. Open `http://localhost:3004/admin/api`.
4. Confirm the local demo config is already present after `npm run commerce:reset`, or set AgentGate Base URL to `http://127.0.0.1:3001`.
5. Confirm Agent ID is `demo-commerce-support-agent`.
6. Paste a newly created key only if you are testing key creation manually, then save.
7. Refresh and confirm only an `ag_test_...` prefix is visible.
8. Click `Test connection`.

Customer chat messages to test:

```text
What backpacks do you sell?
Where is my latest order?
Cancel my latest order.
Please resend my receipt for my latest order.
Delete my customer record.
```

Expected decisions:

- Product questions answer from the local catalog and do not need a business action.
- Checkout-created high-value cancellation calls AgentGate and returns `REQUIRE_APPROVAL`.
- Receipt resend calls AgentGate and is simulated only after an allowed/logged decision or held for approval.
- Customer data deletion calls AgentGate and returns `BLOCK`; no customer data is deleted.

Where to inspect results in AgentGate:

- `http://localhost:3001/integrations/demo-commerce`
- `http://localhost:3001/approvals`
- `http://localhost:3001/audit-logs`
- `http://localhost:3001/actions`

Where to inspect results in Northstar:

- Customer dashboard: `http://localhost:3004/account`
- Customer tracking: `http://localhost:3004/account/tracking`
- Customer receipts: `http://localhost:3004/account/receipts`
- Admin dashboard: `http://localhost:3004/admin`
- Admin order detail: `http://localhost:3004/admin/orders/<orderNumber>`
- Admin fulfillment board: `http://localhost:3004/admin/fulfillment`
- Admin tracking operations: `http://localhost:3004/admin/tracking`

To complete the browser approval flow:

1. Log out of AgentGate as owner.
2. Log in as `reviewer@agentgate.dev` / `Password123!`.
3. Open the pending `order.cancel` approval from `/approvals`.
4. Approve it with a review comment.
5. Return to Northstar admin `/admin/orders`.
6. Click `Sync approved AgentGate actions`.
7. Confirm the local order is `Cancelled`.
8. Confirm AgentGate `/actions` shows the action as `EXECUTED`.

Automated browser coverage for this bridge lives in
`tests/e2e/demo-commerce-api-key-bridge.spec.ts`. The test stores the generated
key in Playwright memory only, verifies it disappears after refresh, configures
Northstar admin, runs the chat flow, and checks AgentGate visibility.

## Testing AgentGate with the Support Operations Agent

AgentGate includes a local TypeScript Support Operations Agent that reads support
ticket scenarios, decides what business action it wants to take, calls AgentGate
before doing anything, obeys the decision, and writes a JSON transcript.

Dry run mode does not require a live server:

```bash
npm run agent:support:dry-run
```

Live mode requires the app and seeded demo database:

```bash
npm run agent:support:large-refund
npm run agent:support:blocked-delete
npm run agent:support:external-email
```

The agent never calls paid AI APIs and never touches real Stripe, Gmail, Slack,
Postgres, or external webhook systems. See
[examples/agents/support-ops-agent/README.md](examples/agents/support-ops-agent/README.md).

### Testing the Support Operations Agent in the Browser

AgentGate also includes a browser-based Agent Lab for the same Support Operations
Agent. After seeding the demo database and logging in, open:

```text
http://localhost:3000/developer/agent-lab
```

The Agent Lab lets you run five safe scenarios from the UI:

- Small refund
- Large refund
- Blocked customer delete
- External customer email
- Production database write

Each run uses the seeded local-only demo API key on the server side, calls the
same Gateway service as `/api/gateway/check`, and displays the decision, risk
signals, action request, approval request, transcript summary, payload, metadata,
and audit/action links. The full API key is never sent to the browser, stored in
the UI, or logged.

### Full Support Operations Agent Integration Test

Use this flow to prove AgentGate actually controls the local Support Operations
Agent across allow/approval/block paths. V1 still uses simulated execution only:
no paid AI APIs and no real Stripe, Gmail, Slack, Postgres, or external webhook
actions.

Dry-run checks:

```bash
npm run agent:support:dry-run
npm run agent:support:small-refund -- --dry-run
npm run agent:support:large-refund -- --dry-run
npm run agent:support:blocked-delete -- --dry-run
npm run agent:support:external-email -- --dry-run
npm run agent:support:database-write -- --dry-run
```

Live scenario checks after the app is running and the demo DB is seeded:

```bash
npm run agent:support:small-refund
npm run agent:support:large-refund
npm run agent:support:blocked-delete
npm run agent:support:external-email
npm run agent:support:database-write
```

Expected decisions:

- `small-refund`: `ALLOW`, `LOG_ONLY`, or `REQUIRE_APPROVAL` depending on current risk and policy rules.
- `large-refund`: `REQUIRE_APPROVAL`; the agent must not execute before approval.
- `blocked-delete`: `BLOCK`; the agent must not execute.
- `external-email`: `REQUIRE_APPROVAL`; the agent must not execute before approval.
- `database-write`: `REQUIRE_APPROVAL` or `BLOCK`; the agent must obey the returned decision.

Approve the latest large-refund demo approval and resume execution:

```bash
npm run demo:approve-latest
npm run agent:support -- --resume <actionRequestId>
```

Test paused-agent behavior:

```bash
npm run demo:pause-support-agent
npm run agent:support:large-refund
npm run demo:resume-support-agent
```

Test organization kill-switch behavior:

```bash
npm run demo:enable-org-kill-switch
npm run agent:support:small-refund
npm run demo:disable-org-kill-switch
```

Verify database records, audit logs, risk assessments, approval behavior, blocked
behavior, and transcript secret safety:

```bash
npm run verify:agent-integration
```

Optional `Idempotency-Key` headers are scoped to the authenticated organization
and API key. Reuse an idempotency key only for the exact same request body;
AgentGate rejects mismatched replays.

Tool Proxy mode lets a demo agent call AgentGate as if it were calling a tool.
AgentGate runs the same gateway risk and policy check first, then blocks,
creates approval, or simulates execution for immediately allowed demo actions.
V1 never calls real Stripe, Gmail, Slack, Postgres, webhook, or external systems.

```bash
curl -X POST http://localhost:3000/api/tool-proxy/slack/message.send \
  -H "Authorization: Bearer ag_test_seed_support_refund_demo_key" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: slack-proxy-demo-001" \
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
  }'
```

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- bcryptjs
- jose
- npm

## Architecture

```text
AI Agent -> AgentGate Gateway API -> Local Safety Engine -> Policy Decision -> Approval Inbox -> Audit Log
```

The important V1 flow:

1. An AI agent calls `POST /api/gateway/check` with an API key.
2. AgentGate authenticates the key and resolves the organization and agent.
3. The local TypeScript risk engine scores the action.
4. The policy engine decides `ALLOW`, `REQUIRE_APPROVAL`, `BLOCK`, `LOG_ONLY`, or `SANDBOX_ONLY`.
5. High-risk actions can create an Approval Inbox item.
6. Every important step is written to the audit log.
7. Execution is simulated only.

## V1 Scope

V1 focuses on:

- Organizations and membership roles
- Email/password login with httpOnly sessions
- Agent registry
- Hashed API keys for agents and developers
- Gateway checks
- Local deterministic risk scoring
- Policy decisions
- Approval Inbox
- Audit logs and CSV export
- Demo integrations
- Display-only billing
- Lightweight reports
- Organization kill switch

## What V1 Intentionally Does Not Do

- No OpenAI, Anthropic, Gemini, or paid AI APIs
- No model training claims
- No SOC 2 claim
- No real Stripe refunds
- No real emails
- No real Slack messages
- No real database writes
- No live Stripe billing
- No external credentials required
- No production tool side effects

AgentGate V1 uses local rules only.

## Environment Variables

Copy `.env.example` to `.env` or `.env.local` and set values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agentgate"
APP_URL="http://localhost:3000"
SESSION_SECRET="replace-with-a-long-random-secret"
API_KEY_PEPPER="replace-with-a-long-random-secret"
ENCRYPTION_KEY="replace-with-32-byte-key"
NODE_ENV="development"
```

`API_KEY_PEPPER` must remain stable for stored API key hashes to keep working.

### Required Env Vars and Production Warnings

AgentGate validates configuration at startup through `src/lib/env.ts`.

Required variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `APP_URL`: Public app URL, for example `http://localhost:3000` locally or an HTTPS production URL.
- `SESSION_SECRET`: Long random secret for httpOnly human session cookies.
- `API_KEY_PEPPER`: Long random pepper used to hash API keys before storage.
- `ENCRYPTION_KEY`: Reserved V1 secret for future encrypted integration config.
- `NODE_ENV`: `development`, `test`, or `production`.

In production, these placeholder values are rejected:

- `replace-with-a-long-random-secret`
- `replace-with-32-byte-key`
- `agentgate-development-seed-pepper`

In development, placeholder values are allowed only to keep local setup easy, and
AgentGate prints warnings without printing secret values. Replace placeholders
before deployment.

Secret generation examples:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Keep `SESSION_SECRET`, `API_KEY_PEPPER`, and `ENCRYPTION_KEY` private. Changing
`API_KEY_PEPPER` invalidates existing stored API key hashes.

## Docker Postgres Setup

Start local PostgreSQL:

```bash
docker compose up -d
```

The provided `docker-compose.yml` starts PostgreSQL 16 with:

- user: `postgres`
- password: `postgres`
- database: `agentgate`
- port: `5432`

## Deployment

AgentGate can run as a standard Next.js app with PostgreSQL. See
[docs/deployment-guide.md](docs/deployment-guide.md) for hosted preview steps
and [docs/deployment.md](docs/deployment.md) for additional provider-specific
notes and a production readiness checklist.

## Hosted Preview Checklist

Use this when deploying AgentGate somewhere you can open from your browser, such
as Vercel, Render, or Railway.

1. Create or attach a hosted PostgreSQL database.
2. Add required environment variables in the provider UI:
   - `DATABASE_URL`
   - `APP_URL`
   - `SESSION_SECRET`
   - `API_KEY_PEPPER`
   - `ENCRYPTION_KEY`
   - `NODE_ENV=production`
3. Use real generated secrets. Do not use placeholder values from
   `.env.example`.
4. Use build command:

```bash
npm run build
```

5. Use start command for full-stack Node hosts:

```bash
npm run start
```

6. Run production migrations after the database is available:

```bash
npm run db:deploy
```

7. For a hosted demo preview only, seed demo data:

```bash
npm run db:seed
```

Do not run the demo seed against real customer production data.

Provider clicks:

- Vercel: import this GitHub repo, keep Next.js defaults, attach hosted Postgres
  or add `DATABASE_URL`, add env vars in Project Settings, deploy, then run
  `npm run db:deploy`.
- Render: create a Web Service plus PostgreSQL service, set build command
  `npm ci && npm run build`, start command `npm run start`, add env vars, deploy,
  then run migrations from Render Shell or a one-off job.
- Railway: create a GitHub project, add Postgres, add env vars, deploy, then run
  migrations from the service shell or a deploy command.

After seeding a preview database, log in with `owner@agentgate.dev` /
`Password123!`, open Developer -> Agent Lab, run `large-refund`, then approve it
as `reviewer@agentgate.dev`.

### Local Docker Postgres

For local demos, use the included Compose file:

```bash
docker compose up -d
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The seed command is for demos only. Do not use the seeded demo API key in a real
deployment.

## Resetting The Demo

Use these commands whenever you want to return AgentGate to a clean V1 demo
state:

```bash
npm run demo:reset
npm run demo:check
```

`npm run demo:reset` resets only the AgentGate demo tenant:

- Acme AI Operations organization
- demo users
- demo agents
- demo policies
- demo API key hash
- sample action requests
- sample approvals
- sample risk assessments
- sample audit logs

It does not delete unrelated organizations. The local-only seeded demo key is
still `ag_test_seed_support_refund_demo_key`, and only its hash is stored.

### Docker Image

Build the app image:

```bash
docker build -t agentgate:local .
```

Run it with runtime environment variables:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/agentgate" \
  -e APP_URL="http://localhost:3000" \
  -e SESSION_SECRET="replace-with-a-real-random-secret" \
  -e API_KEY_PEPPER="replace-with-a-real-random-secret" \
  -e ENCRYPTION_KEY="replace-with-a-real-32-byte-key" \
  agentgate:local
```

The Dockerfile does not include secrets. It skips build-time env validation only
while building the image; AgentGate still validates runtime env when the app runs.

### Vercel

1. Create a Vercel project from this repository.
2. Attach a managed PostgreSQL database or provide `DATABASE_URL`.
3. Set all required environment variables in Vercel Project Settings.
4. Run Prisma migrations during deployment or from a trusted admin shell:

```bash
npx prisma migrate deploy
```

Vercel should use the normal build command:

```bash
npm run build
```

### Render

Use a Web Service with:

```bash
npm install && npx prisma generate && npm run build
```

Start command:

```bash
npm run start
```

Run migrations from Render Shell or a one-off job:

```bash
npx prisma migrate deploy
```

### Railway, Fly.io, And Similar Hosts

Use the Dockerfile or standard Node build. Provide a PostgreSQL service, set the
required env vars, run migrations with `npx prisma migrate deploy`, then start
with `npm run start`.

### Required Production Env Vars

- `DATABASE_URL`
- `APP_URL`
- `SESSION_SECRET`
- `API_KEY_PEPPER`
- `ENCRYPTION_KEY`
- `NODE_ENV=production`

Generate production secrets with:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

### Production Readiness Checklist

- Set `DATABASE_URL` to a production PostgreSQL database.
- Set `SESSION_SECRET` to a long random value.
- Set `API_KEY_PEPPER` to a long random value and keep it stable.
- Set `ENCRYPTION_KEY` to a long random value.
- Run `npx prisma migrate deploy`.
- Create the first organization and user through onboarding or a controlled admin process.
- Do not run the demo seed in real production.
- Disable or revoke any demo seed API key before real customer use.
- Confirm no real Stripe, email, Slack, webhook, or database side effects are enabled in V1.

## Prisma Commands

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

Seed demo data:

```bash
npm run prisma:seed
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

## Login Credentials

Seeded demo users:

- `owner@agentgate.dev` / `Password123!`
- `security@agentgate.dev` / `Password123!`
- `developer@agentgate.dev` / `Password123!`
- `reviewer@agentgate.dev` / `Password123!`
- `auditor@agentgate.dev` / `Password123!`
- `platform@agentgate.dev` / `Password123!` (demo platform owner)

## Demo API Key

The seed command prints a local demo API key:

```text
ag_test_seed_support_refund_demo_key
```

Only its hash is stored. This key is local-only demo material, is never used for
human login, and should not be reused outside a local AgentGate demo.

## Run the Dev Server

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Test the Gateway Endpoint

Run this after seeding the database:

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

Expected result:

- `decision`: `REQUIRE_APPROVAL`
- `requiresApproval`: `true`
- `status`: `PENDING_APPROVAL`

## Test Tool Proxy Mode

Run this after seeding the database:

```bash
curl -X POST http://localhost:3000/api/tool-proxy/slack/message.send \
  -H "Authorization: Bearer ag_test_seed_support_refund_demo_key" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: slack-proxy-demo-001" \
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
  }'
```

Expected result:

- `mode`: `tool_proxy`
- `decision`: `ALLOW` or `LOG_ONLY` for an allowed demo notification
- `executed`: `true`
- `result.simulated`: `true`

Tool Proxy mode is demo-only in V1. It shares gateway authentication,
tenant isolation, risk scoring, policy evaluation, approval creation, simulated
execution, and audit logging, but it does not perform real external side effects.

## Approve an Action

1. Login as `owner@agentgate.dev` or `reviewer@agentgate.dev`.
2. Go to `/approvals`.
3. Open the pending approval.
4. Review the agent, tool, action, risk signals, policy reason, payload, and metadata.
5. Add an optional comment.
6. Click Approve.
7. The related `ActionRequest` moves to `APPROVED`.
8. The approval decision is written to Audit Logs.

## Test the Kill Switch

1. Login as `owner@agentgate.dev` or `security@agentgate.dev`.
2. Go to `/settings`.
3. Enable the organization kill switch.
4. Send the gateway curl request again.
5. AgentGate returns `BLOCK`.
6. Go to `/audit-logs` and confirm the kill-switch audit event and blocked gateway action.

Disable the kill switch from `/settings` when finished.

## Gateway Execute and Cancel

V1 never performs real external execution.

Use `POST /api/gateway/execute` only after an action is `ALLOWED` or `APPROVED`; it marks the action as `EXECUTED` and returns a simulated result.

Use `POST /api/gateway/cancel` to cancel pending/requested actions and any pending approval request.

## Using the SDK Starter

AgentGate includes a small local TypeScript SDK starter in `src/sdk`. It is not
published to npm yet and is intended as repo-local starter code for developers
connecting AI agents to the V1 Gateway API.

```ts
import { AgentGateClient } from "@/sdk";

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
}
```

Available methods:

- `check(input)`
- `execute(actionRequestId)`
- `cancel(actionRequestId)`

The SDK uses `fetch`, works in Node 18+, and does not call paid AI APIs.

## Verification Scripts

Risk engine:

```bash
npm run verify:risk
```

Policy engine:

```bash
npm run verify:policy
```

Gateway examples and optional live verification:

```bash
npm run verify:gateway
```

For live gateway verification:

```bash
APP_URL="http://localhost:3000" \
AGENTGATE_DEMO_API_KEY="ag_test_seed_support_refund_demo_key" \
npm run verify:gateway
```

Browser E2E smoke tests:

```bash
npm run test:e2e
```

The E2E suite starts the app on `http://127.0.0.1:3100`. Public page tests run
without a database. The authenticated demo flow requires a migrated and seeded
database; if `/api/demo/status` reports missing seed data, that protected flow is
skipped with a setup message instead of pretending the login demo passed.

## Final Demo Script

1. Login as `owner@agentgate.dev`.
2. Go to Dashboard.
3. See pending high-risk approval.
4. Go to Agents.
5. Open Support Refund Agent.
6. See allowed tools and recent risky actions.
7. Go to Policies.
8. See Refunds above $500 require approval.
9. Use curl or Developer Docs to send a refund action for `$1,200`.
10. AgentGate returns `REQUIRE_APPROVAL`.
11. Go to Approval Inbox.
12. Open approval.
13. See risk signals and policy reason.
14. Approve it.
15. Go to Audit Logs.
16. See full trail.
17. Pause agent.
18. Send same gateway request.
19. AgentGate returns `BLOCK` because the agent is paused.

## Product Roadmap

Near-term:

- Richer approval assignment and escalation
- Policy templates
- More report filters
- Better API docs and typed examples
- Webhook notifications
- MCP gateway architecture notes in `docs/mcp-gateway.md`

Future:

- Full MCP gateway for controlled MCP-compatible tool calls
- Local model reviewer option
- Premium model reviewer option
- SSO and enterprise identity
- Real integration adapters with strict sandboxing
- Live billing integration

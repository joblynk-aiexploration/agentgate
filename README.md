# AgentGate

AgentGate is an enterprise-grade multi-tenant SaaS demo: the safety, approval, and audit layer for AI agents.

One-line pitch: AgentGate lets AI agents request sensitive actions through a governed gateway before anything is approved, blocked, simulated, or audited.

V1 is intentionally honest demo software: risk scoring is local TypeScript, policy
decisions are deterministic, integrations are simulated, and no paid AI APIs or
real business-tool side effects are required.

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
[docs/deployment.md](docs/deployment.md) for provider-specific notes and a
production readiness checklist.

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

Future:

- TypeScript SDK
- Tool proxy
- MCP gateway
- Local model reviewer option
- Premium model reviewer option
- SSO and enterprise identity
- Real integration adapters with strict sandboxing
- Live billing integration

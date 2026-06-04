# AgentGate

AgentGate is an enterprise-grade multi-tenant SaaS product: the safety, approval, and audit layer for AI agents.

V1 focuses on a working demo flow where AI agent actions pass through a gateway, local safety engine, policy decision, approval inbox, and audit log before simulated execution.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- npm

## Local Setup

Local setup is intentionally light while the foundation is being built.

1. Copy `.env.example` to `.env.local` and update secrets.
2. Start PostgreSQL with `docker compose up -d`.
3. Install dependencies with `npm install`.
4. Run Prisma setup with `npm run prisma:generate` and `npm run prisma:migrate`.
5. Start the app with `npm run dev`.

## V1 AI Policy

AgentGate V1 uses local deterministic TypeScript rules only. It does not call OpenAI, Anthropic, Gemini, or other paid AI APIs.

## Gateway API

AgentGate agents call the gateway with API keys, not human login sessions. API keys use the `ag_test_` prefix in V1. Full keys are shown once at creation and only hashes are stored.

Example gateway check:

```bash
curl -X POST "http://localhost:3000/api/gateway/check" \
  -H "Authorization: Bearer <ag_test_api_key>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-refund-1200" \
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
  }'
```

V1 execution is simulated only. The `/api/gateway/execute` route records simulated execution and never calls Stripe, Gmail, Slack, or other external tools.

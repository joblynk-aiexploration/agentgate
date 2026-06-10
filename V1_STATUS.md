# AgentGate V1 Status

Last checked: 2026-06-10

## Current Status

AgentGate V1 is ready for personal local testing and guided founder/advisor demos.

This version is intentionally scoped to the core AgentGate control loop:

```text
AI Agent -> AgentGate Gateway API -> Local Safety Engine -> Policy Decision -> Approval Inbox -> Audit Log
```

V1 uses local deterministic TypeScript rules and simulated integrations. It does not use paid AI APIs and does not execute real external business actions by default.

## What Works

- Public landing page and guided demo page.
- Email/password login with httpOnly session cookies.
- Organization membership and role-based access control.
- Dashboard with tenant-scoped demo metrics.
- Agent registry, agent detail pages, and agent pause/resume controls.
- Hashed API key creation, listing, scoping, and revoke flow.
- Gateway check endpoint with API key authentication, tenant isolation, risk assessment, policy evaluation, idempotency handling, approval creation, audit logging, and safe errors.
- Gateway execute/cancel endpoints for simulated execution only.
- Tool Proxy mode for demo tools.
- Local risk engine with deterministic scoring.
- Policy engine with organization kill switch and agent pause blocking.
- Approval inbox with approve/reject/edit/comment/timeline support.
- Real reviewer approval UI now persists approval and action status.
- Audit log table and CSV export.
- Settings, kill switch, data retention controls, member management, reports, integrations, billing placeholder, developer docs, OpenAPI spec, SDK starter, founder demo docs, and user manual.
- Northstar Outdoor Supply demo commerce app.
- Northstar customer checkout, order tracking, chat agent, admin operations, AgentGate API config, and AgentGate monitor.
- Demo reset and demo state verification scripts.
- Unit tests, browser E2E tests, and live verification scripts.

## What Was Fixed Recently

- Approval UI persistence: reviewer approval now updates `ApprovalRequest.status` and `ActionRequest.status` to `APPROVED`, sets reviewer metadata, and records `approval.approved`.
- Local browser consistency: local E2E and Northstar config use `localhost` to avoid dev hydration issues.
- Ecommerce sync resilience: Northstar admin sync skips stale/missing AgentGate action IDs from old local demo state and continues valid approved cancellations.
- Northstar default AgentGate config is restored by `npm run commerce:reset`.

## Known Remaining Issues

- V1 integrations are simulated. AgentGate does not perform real Stripe refunds, send real emails, post real Slack messages, write real business database rows, or call real webhooks by default.
- Outbound webhook delivery is simulated unless explicitly enabled with `AGENTGATE_ENABLE_OUTBOUND_WEBHOOKS=true`.
- Billing is display-only. There is no live Stripe billing.
- The local risk engine is rules-based. There is no paid AI reviewer in V1.
- The MCP gateway is a placeholder only.
- `verify:agent-integration` requires support-agent scenario traffic before it can pass from a fresh reset.
- Commerce verifiers should be run with `npm run commerce:reset` between them because they create local orders.
- Commerce build prints a harmless Next.js multiple-lockfile workspace-root warning.
- This is a demo-ready V1, not a production compliance claim. Do not claim SOC 2, enterprise SSO, or full production hardening.

## How To Personally Test

Read [docs/PERSONAL_DEMO_GUIDE.md](docs/PERSONAL_DEMO_GUIDE.md).

Fastest test:

1. Start AgentGate:

```bash
npm run dev -- -p 3001
```

2. Start Northstar:

```bash
npm run commerce:dev
```

3. Open:

- AgentGate: `http://localhost:3001`
- Northstar: `http://localhost:3004`

4. In AgentGate, log in as `owner@agentgate.dev` / `Password123!`.
5. Run Developer -> Agent Lab -> `large-refund`.
6. Log in as `reviewer@agentgate.dev` / `Password123!`.
7. Approve the pending approval.
8. Confirm Audit Logs show `approval.approved`.

## Setup Checklist

From a fresh clone:

1. Copy `.env.example` to `.env`.
2. Start Postgres with Docker:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma Client:

```bash
npx prisma generate
```

5. Apply migrations:

```bash
npm run prisma:migrate
```

6. Seed or reset the demo:

```bash
npm run demo:reset
npm run commerce:reset
```

7. Check the demo state:

```bash
npm run demo:check
```

8. Start the apps:

```bash
npm run dev -- -p 3001
npm run commerce:dev
```

## Verification Run

Final personal-readiness validation ran:

- `npm run test`
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run commerce:build`
- `npm run commerce:test`
- `docker start agentgate-postgres || true`
- `npx prisma generate`
- `npx prisma migrate dev`
- `npm run demo:reset`
- `npm run demo:check`
- `npm run commerce:reset`
- `npm run verify:commerce-checkout-agent`
- `npm run verify:commerce-agent`
- support-agent scenario setup
- `npm run verify:agent-integration`

Results:

- Unit tests passed.
- TypeScript passed.
- ESLint passed.
- AgentGate production build passed.
- Commerce production build passed, with the known multiple-lockfile warning.
- Commerce tests passed.
- Prisma generate passed.
- Prisma migrate reported the database is already in sync.
- Demo reset passed.
- Demo state check passed.
- Commerce checkout verifier passed.
- Commerce integration verifier passed.
- Agent integration verifier passed after the required support-agent scenario traffic.

## Readiness Verdict

- Personal testing: yes.
- Friends/advisors: yes, guided.
- Serious customer demo: maybe after you personally verify the full flow on your machine.
- Production: no.

## Positioning Reminder

When showing AgentGate V1, say:

- Local rules only.
- Simulated integrations only.
- No paid AI APIs.
- No real external side effects.
- Demo API key is local-only.
- Core safety, approval, and audit flow is working.

Do not claim:

- SOC 2 readiness.
- Enterprise SSO.
- Real Stripe/Gmail/Slack integrations.
- Production compliance hardening.
- AI model training or paid AI reviewer behavior.

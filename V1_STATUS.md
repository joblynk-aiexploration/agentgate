# AgentGate V1 Status

Last checked: 2026-06-05

## Current Status

AgentGate V1 is demo-ready for a local founder/customer walkthrough after running the documented setup, migrations, and seed/reset commands.

This version is intentionally scoped to the core AgentGate control loop:

```text
AI Agent -> AgentGate Gateway API -> Local Safety Engine -> Policy Decision -> Approval Inbox -> Audit Log
```

V1 uses local deterministic TypeScript rules and simulated integrations. It does not use paid AI APIs and does not execute real external business actions by default.

## Working Features

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
- Audit log table and CSV export.
- Settings, kill switch, data retention controls, member management, reports, integrations, billing placeholder, developer docs, OpenAPI spec, SDK starter, founder demo docs, and user manual.
- Demo reset and demo state verification scripts.
- Unit tests and Playwright smoke tests.

## Known Limitations

- V1 integrations are simulated. AgentGate does not perform real Stripe refunds, send real emails, post real Slack messages, write real business database rows, or call real webhooks by default.
- Outbound webhook delivery is simulated unless explicitly enabled with `AGENTGATE_ENABLE_OUTBOUND_WEBHOOKS=true`.
- Billing is display-only. There is no live Stripe billing.
- The local risk engine is rules-based. There is no paid AI reviewer in V1.
- The MCP gateway is a placeholder only.
- E2E tests require browsers installed through Playwright and a seeded local database for the authenticated flow.
- This is a demo-ready V1, not a production compliance claim. Do not claim SOC 2, enterprise SSO, or full production hardening.

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
```

7. Check the demo state:

```bash
npm run demo:check
```

8. Start the app:

```bash
npm run dev
```

9. Open `http://localhost:3000`.

## Demo Checklist

1. Login as `owner@agentgate.dev` with `Password123!`.
2. Open Dashboard and show tenant-scoped metrics.
3. Open Agents and show Support Refund Agent.
4. Open Policies and show "Refunds above $500 require approval."
5. Call `POST /api/gateway/check` with the local demo API key:

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

6. Confirm the response is `REQUIRE_APPROVAL`.
7. Open Approval Inbox and inspect risk signals.
8. Approve or reject the action.
9. Open Audit Logs and show the full trail.
10. Pause Support Refund Agent.
11. Send the same gateway request again.
12. Confirm AgentGate returns `BLOCK` because the agent is paused.
13. Optionally enable the organization kill switch in Settings and confirm gateway requests return `BLOCK`.
14. Disable the kill switch before ending the demo.

## Verification Run

The final V1 lock pass ran:

- `npm install`
- `npx prisma format`
- `npx prisma generate`
- `npm run test`
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- `npm run demo:reset`
- `npm run demo:check`
- `npm run verify:demo-data`
- `npm run verify:demo`
- `npm run verify:security`

Results:

- Unit tests passed.
- TypeScript passed.
- ESLint passed.
- Production build passed.
- Playwright E2E passed.
- Demo reset passed.
- Demo state check passed.
- Demo data verification passed.
- V1 demo verification passed.
- Security basics verification passed.

Local environment note:

- Plain `npm` was not on the default shell PATH in this Codex environment, so commands were run with the local Node tool path prepended.
- The local database at `localhost:55432` was initially stale and missing later checked-in migrations. Prisma's schema engine failed without a useful diagnostic in this environment, so the already committed migration SQL files were applied directly to the local demo database for verification. The repo migration files themselves were not changed.

## Next Recommended Work

- Package a cleaner first-run script for new demo machines.
- Add a clearer warning when demo reset is attempted against an unmigrated database.
- Expand E2E coverage for approval approve/reject and kill-switch behavior.
- Add a production deployment smoke test for health, database connection, and migration status.
- Improve webhook delivery controls before enabling any real outbound delivery.
- Continue customer discovery around the first paid wedge: support refunds, customer communications, or regulated operational actions.

## Ready To Show

Yes. AgentGate V1 is ready to show as a local demo, with honest positioning:

- Local rules only.
- Simulated integrations only.
- No paid AI APIs.
- No real external side effects.
- Demo API key is local-only.
- Core safety, approval, and audit flow is working.

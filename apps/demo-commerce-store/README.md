# Northstar Outdoor Supply Demo Store

Northstar Outdoor Supply is a local ecommerce demo app for testing AgentGate from the perspective of another website. It runs independently from AgentGate and embeds a server-side, rules-based support agent.

The flow is:

Customer → ecommerce chat widget → ecommerce support backend → AgentGate Gateway API → policy/risk decision → simulated local store action

## Run Locally

From the AgentGate repo root:

```bash
npm run demo:reset
npm run demo:check
npm run commerce:install
npm run commerce:reset
npm run dev -- -p 3001
```

In another terminal:

```bash
npm run commerce:dev
```

Open AgentGate at `http://localhost:3001` and Northstar at `http://localhost:3004`.

## Admin

Admin login:

- Email: `admin@northstar-demo.dev`
- Password: `Password123!`

Open `http://localhost:3004/admin/api` and save:

- AgentGate Base URL: `http://localhost:3001`
- API key: `ag_test_seed_demo_commerce_agent_key`
- Agent ID: `demo-commerce-support-agent`
- Environment: `production`

The full API key is accepted once and stored only in ignored local server config at `data/config.local.json`. The browser only receives a safe prefix after save.

## Test the Agent

Open the chat widget and try:

- `What backpacks do you sell?`
- `Where is my order NS-1001? sarah@example.com`
- `Cancel my order NS-1002. My email is sarah@example.com.`
- `Cancel my order NS-1003. My email is sarah@example.com.`
- `Can you resend my receipt for NS-1001 to sarah@example.com?`
- `I want to return order NS-1004. omar@example.com`
- `Delete my customer record. sarah@example.com`

Expected AgentGate behavior:

- `NS-1002` cancellation should return `REQUIRE_APPROVAL`.
- `NS-1003` shipped cancellation should return `BLOCK`.
- Receipt resend is checked through AgentGate. In production, current V1 risk rules may escalate it to `REQUIRE_APPROVAL`; the demo store obeys that result and does not send real email.
- Return request for `NS-1004` calls AgentGate and obeys the returned decision.
- Customer data deletion routes through AgentGate and is blocked or safely refused; no customer data is deleted.
- Agent logs are visible at `/admin/agent-logs` with action and approval IDs.

Inside AgentGate, inspect:

- `/actions` for `demo-commerce-support-agent` action requests.
- `/approvals` for the `NS-1002` cancellation approval.
- `/audit-logs` for `gateway.action_checked`, `approval.requested`, and `action.blocked`.

## Automated Integration Check

With both apps running and the demo database seeded:

```bash
npm run verify:commerce-agent
```

This script uses the same server-side config storage as `/admin/api`, runs the
core chat scenarios, verifies AgentGate action/approval/audit records, confirms
admin logs have action IDs, confirms shipped orders and customer records were
not changed unsafely, and checks that the full local-only API key is not exposed
on rendered or admin-visible surfaces.

## Testing with a Newly Created AgentGate API Key

Use this when you want to prove the manual product flow instead of relying on
the seeded local key.

1. Open AgentGate at `http://localhost:3001`.
2. Log in with `owner@agentgate.dev` / `Password123!`.
3. Open `http://localhost:3001/developer/api-keys`.
4. Create a key scoped to `Demo Commerce Support Agent`.
5. Copy the full key from the one-time reveal.
6. Open `http://localhost:3004/admin/login`.
7. Log in with `admin@northstar-demo.dev` / `Password123!`.
8. Open `http://localhost:3004/admin/api`.
9. Set Base URL to `http://localhost:3001`.
10. Set Agent ID to `demo-commerce-support-agent`.
11. Paste the key, save, refresh, and confirm only an `ag_test_...` prefix is visible.
12. Click `Test connection`.
13. Open the customer store and test the chat messages below.

Manual chat checks:

- `What backpacks do you sell?` should answer from the local catalog.
- `Cancel my order NS-1002. My email is sarah@example.com.` should require approval.
- `Cancel my order NS-1003. My email is sarah@example.com.` should be blocked.
- `Please resend my receipt for NS-1001 to sarah@example.com.` should call AgentGate and simulate or hold for approval.
- `Delete my customer record. My email is sarah@example.com.` should be blocked or safely refused without deleting data.

Inspect AgentGate at `/integrations/demo-commerce`, `/approvals`, `/audit-logs`,
and `/actions`. Full API keys should never appear on customer pages, admin safe
views, screenshots, or committed files.

## Safety

This app does not use paid AI APIs. It does not call Stripe, Gmail, Slack, Postgres business systems, or external webhooks. All business actions are simulated in a local JSON file after AgentGate returns a safe decision.

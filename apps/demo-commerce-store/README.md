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

Northstar now includes a polished storefront, customer portal, admin dashboard,
fulfillment board, tracking system, receipts page, and AgentGate activity
monitoring surfaces. UI audit notes are in `docs/ui-audit.md`; screenshot notes
are in `docs/ui-polish-review.md`.

## Admin

Admin login:

- Email: `admin@northstar-demo.dev`
- Password: `Password123!`

After `npm run commerce:reset`, Northstar is already configured for the local
AgentGate demo. Open `http://localhost:3004/admin/api` to verify or change:

- AgentGate Base URL: `http://127.0.0.1:3001`
- API key: `ag_test_seed_demo_commerce_agent_key`
- Agent ID: `demo-commerce-support-agent`
- Environment: `production`

The full API key is accepted once and stored only in ignored local server config at `data/config.local.json`. The browser only receives a safe prefix after save.

## Test the Agent

Customer login:

- Email: `customer@northstar-demo.dev`
- Password: `Password123!`

After `npm run commerce:reset`, Sarah starts with no orders. Create one first:

1. Open `http://localhost:3004/login` and log in as Sarah.
2. Open `/products`, add the SummitPro Backpack and AlpineShell Jacket to cart.
3. Open `/checkout` and place the demo order with the prefilled fake card.
4. Copy the new order number from `/checkout/success`.
5. Open the chat widget and try:

- `What backpacks do you sell?`
- `Where is my latest order?`
- `Cancel my latest order.`
- `Can you resend my receipt for my latest order?`
- `Delete my customer record.`

Expected AgentGate behavior:

- High-value checkout order cancellation should return `REQUIRE_APPROVAL`.
- Receipt resend is checked through AgentGate. In production, current V1 risk rules may escalate it to `REQUIRE_APPROVAL`; the demo store obeys that result and does not send real email.
- Customer data deletion routes through AgentGate and is blocked or safely refused; no customer data is deleted.
- Agent logs are visible at `/admin/agent-logs` with action and approval IDs.
- After an eligible AgentGate reviewer approves the `order.cancel` approval,
  open `/admin/orders` and click `Sync approved AgentGate actions`. Northstar
  calls AgentGate execute with the approved action request, simulates the
  cancellation locally, and marks the order `Cancelled`.

Inside AgentGate, inspect:

- `/actions` for `demo-commerce-support-agent` action requests.
- `/approvals` for the checkout-created cancellation approval.
- `/audit-logs` for `gateway.action_checked`, `approval.requested`, and `action.blocked`.

## Automated Integration Check

With both apps running and the demo database seeded:

```bash
npm run verify:commerce-agent
```

This script uses the same server-side config storage as `/admin/api`, runs the
real customer login, cart, checkout, and chat scenarios. It verifies AgentGate
action/approval/audit records, confirms admin logs have action IDs, confirms
customer records were not changed unsafely, and checks that the full local-only
API key is not exposed on rendered or admin-visible surfaces.

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
9. Confirm the default Base URL is `http://127.0.0.1:3001`, or set your own AgentGate URL.
10. Set Agent ID to `demo-commerce-support-agent`.
11. Paste the key, save, refresh, and confirm only an `ag_test_...` prefix is visible.
12. Click `Test connection`.
13. Log in to the customer store as `customer@northstar-demo.dev` / `Password123!`.
14. Add products to cart, checkout, and copy the generated `NS-XXXX` order number.
15. Test the chat messages below.

Manual chat checks:

- `What backpacks do you sell?` should answer from the local catalog.
- `Where is my latest order?` should find the checkout-created order.
- `Cancel my latest order.` should require approval when the total is above $100.
- `Please resend my receipt for my latest order.` should call AgentGate and simulate or hold for approval.
- `Delete my customer record.` should be blocked or safely refused without deleting data.

Inspect AgentGate at `/integrations/demo-commerce`, `/approvals`, `/audit-logs`,
and `/actions`. Full API keys should never appear on customer pages, admin safe
views, screenshots, or committed files.

To complete the approval-to-execution demo, log in to AgentGate as
`reviewer@agentgate.dev` / `Password123!`, approve the pending `order.cancel`
request, then return to Northstar `/admin/orders` and run the sync. The sync is
conservative: it executes only approved cancellation requests and ignores
unrelated pending receipt/email approvals.

Northstar tracking/admin pages to inspect:

- `/account` for customer dashboard metrics and latest order.
- `/account/orders/[orderNumber]` for item totals, tracking timeline, and agent activity.
- `/account/tracking` for customer-visible tracking from real local order events.
- `/account/receipts` for preview-only receipt records.
- `/admin` for operations metrics.
- `/admin/orders/[orderNumber]` for fulfillment controls, notes, AgentGate IDs, and full event timeline.
- `/admin/fulfillment` for a local fulfillment board.
- `/admin/tracking` for tracking operations across orders.

## Safety

This app does not use paid AI APIs. It does not call Stripe, Gmail, Slack, Postgres business systems, or external webhooks. All business actions are simulated in a local JSON file after AgentGate returns a safe decision.

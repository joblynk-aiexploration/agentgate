# AgentGate Personal Demo Guide

Last checked: 2026-06-10

This guide is for a founder-led local test of AgentGate V1 using the AgentGate app and the Northstar Outdoor Supply demo ecommerce site.

## What This Demo Proves

AgentGate can sit between an AI agent and business actions, evaluate risk, apply policy, require human approval, simulate execution, and write an audit trail.

The core proof:

```text
AI Agent -> AgentGate Gateway -> Local Risk Engine -> Policy Decision -> Approval Inbox -> Audit Log
```

The ecommerce proof:

```text
Northstar chat agent -> AgentGate -> Approval request -> Reviewer approval -> Safe local sync -> Audit trail
```

## What Is Simulated

- Stripe refunds are simulated.
- Emails are previewed/simulated.
- Slack messages are simulated.
- Postgres business writes are simulated.
- Webhook deliveries are simulated by default.
- Northstar checkout uses fake local orders and fake payment input.
- Billing is placeholder only.
- AI reviewer mode is local rules only.

## What Is Not Real

- No real payment is processed.
- No real refund is issued.
- No real email is sent.
- No real Slack message is posted.
- No real external webhook is called by default.
- No paid AI APIs are used.
- This is not production compliance software.

## Required Local URLs

- AgentGate: `http://localhost:3001`
- Northstar Outdoor Supply: `http://localhost:3004`

## Startup Commands

Run these from the repo root if the servers are not already running:

```bash
npm run dev -- -p 3001
npm run commerce:dev
```

Expected:

- AgentGate loads at `http://localhost:3001`.
- Northstar loads at `http://localhost:3004`.

## Required Accounts

AgentGate:

- `owner@agentgate.dev` / `Password123!`
- `security@agentgate.dev` / `Password123!`
- `developer@agentgate.dev` / `Password123!`
- `reviewer@agentgate.dev` / `Password123!`
- `auditor@agentgate.dev` / `Password123!`

Northstar:

- `customer@northstar-demo.dev` / `Password123!`
- `admin@northstar-demo.dev` / `Password123!`

## Optional Clean Reset

Use this when you want a predictable fresh demo state:

```bash
docker start agentgate-postgres || true
npx prisma generate
npx prisma migrate dev
npm run demo:reset
npm run demo:check
npm run commerce:reset
```

## AgentGate-Only Test

1. Open `http://localhost:3001`.
2. Log in as `owner@agentgate.dev` / `Password123!`.
3. Open Dashboard.
4. Open Developer -> Agent Lab.
5. Run `large-refund`.
6. Confirm the result says `REQUIRE_APPROVAL`.
7. Open Approvals.
8. Confirm the new approval appears.
9. Log out.
10. Log in as `reviewer@agentgate.dev` / `Password123!`.
11. Open the pending approval.
12. Add a review comment.
13. Click Approve.
14. Confirm status changes to `APPROVED`.
15. Confirm there is no `Workspace error`.
16. Open Audit Logs.
17. Confirm `approval.approved` exists.

Expected result:

- Approval status becomes `APPROVED`.
- Action status becomes `APPROVED`.
- The reviewer is recorded.
- Audit logs show `approval.approved`.
- No real external tool action occurs.

## Northstar Ecommerce Test

1. Open `http://localhost:3004`.
2. Log in as `customer@northstar-demo.dev` / `Password123!`.
3. Open Products.
4. Add a product over `$100` to cart, for example SummitPro Backpack.
5. Open Cart.
6. Continue to Checkout.
7. Use fake payment details such as `4242 4242 4242 4242`.
8. Place the demo order.
9. Copy the `NS-XXXX` order number from the success page.
10. Open the chat widget.
11. Ask: `Where is my latest order?`
12. Confirm the agent finds the real checkout-created order.
13. Ask: `Cancel my latest order.`
14. Confirm the customer sees approval required.
15. Open the order detail or account tracking page.
16. Confirm the order is not cancelled before approval.

Expected result:

- The customer can complete a local fake checkout.
- The chat agent can find the checkout-created order.
- Cancellation requires AgentGate approval.
- The order remains processing while approval is pending.

## AgentGate And Ecommerce Agent Integration Test

1. Open AgentGate at `http://localhost:3001`.
2. Log in as `owner@agentgate.dev` / `Password123!`.
3. Open `/integrations/demo-commerce`.
4. Open Northstar admin at `http://localhost:3004/admin/login`.
5. Log in as `admin@northstar-demo.dev` / `Password123!`.
6. Open `/admin/api`.
7. Confirm the saved local AgentGate config:
   - Base URL: `http://localhost:3001`
   - Agent ID: `demo-commerce-support-agent`
   - API key: local demo key or generated key
8. Click Test Connection.
9. Return to the customer chat and ask: `Cancel my latest order.`
10. Go to AgentGate `/integrations/demo-commerce`.
11. Confirm the ecommerce agent action appears.
12. Go to `/approvals`.
13. Log out of owner if needed.
14. Log in as `reviewer@agentgate.dev` / `Password123!`.
15. Open the `order.cancel` approval.
16. Approve it with a review comment.
17. Return to Northstar admin.
18. Open `/admin/orders`.
19. Click Sync approved AgentGate actions.
20. Confirm the approved cancellation sync behavior.
21. Open AgentGate `/audit-logs`.
22. Confirm the full trail includes:
   - `gateway.action_checked`
   - `approval.requested`
   - `approval.approved`
   - `gateway.action_executed`

Expected result:

- AgentGate shows the ecommerce action.
- Reviewer approval persists.
- Northstar does not cancel the order before approval.
- Northstar sync executes only after approval.
- Audit logs show the full trail.

## Troubleshooting

### AgentGate is not configured

Likely cause: Northstar lost or reset its local server-side AgentGate config.

Fix:

1. Open `http://localhost:3004/admin/api`.
2. Confirm Base URL is `http://localhost:3001`.
3. Confirm Agent ID is `demo-commerce-support-agent`.
4. Use the local demo key if needed.
5. Click Save configuration.
6. Click Test Connection.

The full key should not appear after save. The page should show a safe prefix only.

### localhost:3001 does not load

Likely cause: AgentGate dev server is not running.

Fix:

```bash
npm run dev -- -p 3001
```

Then open `http://localhost:3001`.

### localhost:3004 does not load

Likely cause: Northstar dev server is not running.

Fix:

```bash
npm run commerce:dev
```

Then open `http://localhost:3004`.

### Approval does not appear

Likely cause: the action was allowed, blocked, or the demo data was reset after the action was created.

Fix:

1. Re-run Agent Lab `large-refund`, or ask Northstar chat `Cancel my latest order.`
2. Open `/approvals`.
3. Confirm filters are not hiding pending approvals.
4. Run `npm run demo:check` if the database looks stale.

### Workspace error

Likely cause: a real app error or stale dev server state.

Fix:

1. Refresh the page.
2. Make sure you are using `localhost`, not `127.0.0.1`, for local browser testing.
3. Confirm AgentGate is running on `http://localhost:3001`.
4. Re-run `npm run test:e2e` if you need automated confirmation.

### Test connection fails

Likely cause: AgentGate is not running, the Base URL is wrong, or the API key is missing/revoked.

Fix:

1. Open `http://localhost:3001/api/health`.
2. Confirm `database` is `connected`.
3. Open Northstar `/admin/api`.
4. Set Base URL to `http://localhost:3001`.
5. Confirm the key is configured.
6. Click Test Connection again.

### API key rejected

Likely cause: wrong key, stale key, revoked key, or key scoped to a different agent.

Fix:

1. Use the local demo commerce key only for local testing.
2. Or create a new key in AgentGate Developer -> API Keys.
3. Scope it to Demo Commerce Support Agent.
4. Copy it once.
5. Save it in Northstar `/admin/api`.

Never paste full API keys into screenshots, chat, customer pages, or public docs.

### Order not found

Likely cause: you did not complete checkout in the current local store state, or the order belongs to another customer session.

Fix:

1. Log in as `customer@northstar-demo.dev`.
2. Create a fresh checkout order.
3. Ask: `Where is my latest order?`
4. Use the new `NS-XXXX` order number.

### AgentGate monitor empty

Likely cause: no ecommerce agent actions have been created since the last reset.

Fix:

1. Create a Northstar order.
2. Ask the chat: `Cancel my latest order.`
3. Open AgentGate `/integrations/demo-commerce`.

### verify:agent-integration fails after reset

Likely cause: this verifier checks recent support-agent scenario traffic. A clean `demo:reset` does not create every scenario it expects.

Fix:

Run the support-agent scenarios first:

```bash
export AGENTGATE_DEMO_API_KEY=ag_test_seed_support_refund_demo_key
export AGENTGATE_BASE_URL=http://localhost:3001
npm run agent:support:small-refund
npm run agent:support:large-refund
npm run agent:support:blocked-delete
npm run agent:support:external-email
npm run agent:support:database-write
```

Then run:

```bash
npm run verify:agent-integration
```

For the full verifier, the demo also expects one approved/resumed action, one paused-agent block, and one organization kill-switch block. The automated final QA run performs those setup steps before running the verifier.

## Quick First Test

If you only have five minutes:

1. Open `http://localhost:3001`.
2. Log in as owner.
3. Open Developer -> Agent Lab.
4. Run `large-refund`.
5. Log in as reviewer.
6. Approve the new approval.
7. Open Audit Logs and confirm `approval.approved`.

If that works, the core AgentGate demo is alive.

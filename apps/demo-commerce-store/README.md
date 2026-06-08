# Northstar Outdoor Supply Demo Store

Northstar Outdoor Supply is a local ecommerce demo app for testing AgentGate from the perspective of another website. It runs independently from AgentGate and embeds a server-side, rules-based support agent.

The flow is:

Customer → ecommerce chat widget → ecommerce support backend → AgentGate Gateway API → policy/risk decision → simulated local store action

## Run Locally

From the AgentGate repo root:

```bash
npm run commerce:install
npm run commerce:seed
npm run commerce:dev
```

Open `http://localhost:3004`.

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
- Receipt resend is checked through AgentGate and simulated only if allowed or logged.
- Agent logs are visible at `/admin/agent-logs` with action and approval IDs.

## Safety

This app does not use paid AI APIs. It does not call Stripe, Gmail, Slack, Postgres business systems, or external webhooks. All business actions are simulated in a local JSON file after AgentGate returns a safe decision.

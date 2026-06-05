# Support Operations Agent

The Support Operations Agent is a local TypeScript test agent for AgentGate. It simulates an AI support worker that reads ticket scenarios, decides what business action it wants to take, asks AgentGate for permission, obeys the decision, and writes a transcript of the run.

This is not a dummy curl script. The agent has a small deterministic `AgentBrain`, a typed AgentGate client, task memory, scenario fixtures, and a CLI runner. It never touches business tools directly.

## What It Tests

The agent validates the core AgentGate control loop:

```text
Support ticket -> Agent decision -> Tool/action intent -> AgentGate check -> Decision -> Optional simulated execution -> Transcript
```

The agent:

- Reads support ticket scenarios.
- Produces realistic tool/action requests.
- Calls `POST /api/gateway/check` before doing anything.
- Obeys `ALLOW`, `LOG_ONLY`, `REQUIRE_APPROVAL`, `BLOCK`, and `SANDBOX_ONLY`.
- Calls `POST /api/gateway/execute` only when AgentGate allows execution.
- Can poll `GET /api/gateway/actions/[id]` for approval status.
- Writes JSON transcripts to `examples/agents/support-ops-agent/run-logs`.

## Safety

- No OpenAI, Anthropic, Gemini, or paid AI APIs are used.
- No real Stripe, Gmail, Slack, Postgres, or external webhook calls are made by the agent.
- No real refunds are issued.
- No real emails are sent.
- Live mode only talks to AgentGate.
- Dry-run mode uses a mock AgentGate client and does not require a server.

## Environment

Live mode expects:

```bash
AGENTGATE_BASE_URL="http://localhost:3000"
AGENTGATE_DEMO_API_KEY="ag_test_seed_support_refund_demo_key"
AGENTGATE_AGENT_ID="support-refund-agent"
```

The seeded demo key is local-only.

## Dry Run

Dry run demonstrates the agent loop without a live AgentGate server:

```bash
npm run agent:support:dry-run
```

Dry run is clearly marked in output and transcripts. It does not replace live mode.

## Live Mode

Start AgentGate, reset/check the demo data, then run:

```bash
npm run agent:support:large-refund
```

Useful scenarios:

```bash
npm run agent:support:small-refund
npm run agent:support:large-refund
npm run agent:support:blocked-delete
npm run agent:support:external-email
npm run agent:support:database-write
npm run agent:support:all
```

## Large Refund Approval Test

Run:

```bash
npm run agent:support:large-refund
```

Expected live behavior:

1. The agent reads a VIP $1,200 duplicate-charge ticket.
2. It requests `stripe` / `refund.create` in production.
3. AgentGate should return `REQUIRE_APPROVAL`.
4. The agent prints the approval request ID.
5. Approve the request in AgentGate.
6. Rerun with:

```bash
npm run agent:support -- --resume <actionRequestId>
```

or run with:

```bash
npm run agent:support:large-refund -- --wait-for-approval
```

## Blocked Delete Test

Run:

```bash
npm run agent:support:blocked-delete
```

Expected live behavior:

1. The agent reads a production customer deletion ticket.
2. It requests `postgres` / `customer.delete`.
3. AgentGate should return `BLOCK`.
4. The agent stops and does not execute.

## Paused Agent Test

1. Log in to AgentGate.
2. Open Support Refund Agent.
3. Pause the agent.
4. Run:

```bash
npm run agent:support:large-refund
```

Expected live behavior:

- AgentGate returns `BLOCK`.
- The agent stops and writes a blocked transcript.

## Transcripts

Every run writes a JSON transcript under:

```text
examples/agents/support-ops-agent/run-logs
```

Transcripts include the ticket, intended action, AgentGate decision, action request ID, approval request ID when present, simulated execution result when present, and notes.

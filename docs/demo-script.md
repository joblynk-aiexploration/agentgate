# AgentGate Founder Demo Script

Use this script for a focused live demo. The goal is to show the core idea quickly: AI agents can request sensitive actions, but AgentGate adds risk scoring, policies, approvals, kill switches, and audit logs before anything reaches a business tool.

## Setup

Before the call:

1. Start the local app.
2. Make sure the demo database is seeded.
3. Keep a terminal ready with the gateway curl command.
4. Keep the owner login ready:
   - `owner@agentgate.dev`
   - `Password123!`
5. Keep the reviewer login ready:
   - `reviewer@agentgate.dev`
   - `Password123!`

Demo API key, local only:

```text
ag_test_seed_support_refund_demo_key
```

## Live Demo

### 1. Open The Landing Page

Open `/`.

Say:

> AgentGate is the safety, approval, and audit layer for AI agents. It helps companies control what AI agents can access, change, spend, send, approve, and execute.

Point out that V1 is honest demo software:

- Local deterministic rules
- Demo integrations
- No paid AI APIs
- No real Stripe, Gmail, Slack, database, or webhook side effects

### 2. Explain The Flow

Show the core architecture:

```text
AI Agent -> AgentGate -> Business Tool
```

Then expand it:

```text
AI Agent -> Gateway API -> Local Safety Engine -> Policy Decision -> Approval Inbox -> Audit Log
```

Say:

> The AI agent does not get direct access to sensitive tools. It asks AgentGate first.

### 3. Login As Owner

Go to `/login`.

Login with:

```text
owner@agentgate.dev / Password123!
```

### 4. Show Dashboard

Open `/dashboard`.

Point out:

- Total agents
- Pending approvals
- Blocked actions
- High-risk actions
- Critical actions
- Kill switch status
- Recent audit activity

Say:

> This is the operating console for AI-agent activity inside one organization.

### 5. Show Support Refund Agent

Open `/agents`, then open Support Refund Agent.

Point out:

- Agent status
- Department
- Risk tier
- Allowed tools
- Recent actions
- Pause/resume control

Say:

> This is the agent registry. Every agent gets identity, scope, status, and risk context.

### 6. Show Refund Policy

Open `/policies`.

Open or point to the policy:

```text
Refunds above $500 require approval
```

Say:

> This is the policy guardrail. The business can decide which actions require human approval or should be blocked.

### 7. Call Gateway Check With $1,200 Refund

Run:

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

### 8. Show REQUIRE_APPROVAL Response

Point out:

- `decision: REQUIRE_APPROVAL`
- `allowed: false`
- `requiresApproval: true`
- Risk score
- Risk level
- Risk signals
- Approval request ID

Say:

> AgentGate caught that this is a production refund above the policy threshold, so it requires a human approval before simulated execution.

### 9. Open Approval Inbox

Open `/approvals`.

Find the new or seeded approval.

Point out:

- Requested time
- Agent
- Tool
- Action
- Risk
- Required role
- Reason

### 10. Show Risk Signals

Open the approval detail page.

Point out:

- Money movement
- Amount over $500
- Production environment
- Payment/refund action
- Matched policy
- Payload and metadata
- Comments and timeline if available

Say:

> This gives reviewers enough context to make an informed decision.

### 11. Approve As Reviewer

Either continue as owner if allowed by current permissions, or log in as reviewer:

```text
reviewer@agentgate.dev / Password123!
```

Approve the request with a short comment.

Say:

> The approval changes the action state and records who reviewed it.

### 12. Show Audit Log

Open `/audit-logs`.

Point out the trail:

- Gateway check
- Risk assessment
- Approval requested
- Approval approved
- Any simulated execution event

Say:

> This is the evidence trail for security, compliance, and operations.

### 13. Pause Agent

Go back to Support Refund Agent and pause it.

Say:

> AgentGate also supports an immediate kill switch at the agent level.

### 14. Call Gateway Again

Run the same gateway curl command again.

### 15. Show BLOCK Response

Point out:

- `decision: BLOCK`
- `allowed: false`
- Reason mentions the paused agent

Say:

> The same action is now blocked because the agent is paused. This is the core control loop: identity, risk, policy, approval, audit, and kill switch.

## Closing

End with:

> V1 proves the workflow. It does not perform real external actions yet. The next step is learning which tools and approval workflows customers care about most.


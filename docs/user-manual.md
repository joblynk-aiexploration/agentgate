# AgentGate User Manual

AgentGate is the safety, approval, and audit layer for AI agents. It helps teams control what AI agents can access, change, spend, send, approve, and execute before those actions touch business tools.

AgentGate V1 is a local demo product. It uses deterministic TypeScript rules, demo integrations, human approvals, and audit logs. It does not use OpenAI, Anthropic, Gemini, or paid AI APIs, and it does not perform real Stripe refunds, send real emails, post real Slack messages, write to real business databases, or call real external webhooks.

## 1. What AgentGate Is

AgentGate sits between an AI agent and the business tool the agent wants to use.

```text
AI Agent -> AgentGate Gateway API -> Local Safety Engine -> Policy Decision -> Approval Inbox -> Audit Log
```

Instead of giving an AI agent direct access to sensitive tools, the agent sends an action request to AgentGate. AgentGate evaluates the request, applies policies, creates approvals when needed, records the audit trail, and only simulates execution in V1.

## 2. What Problem AgentGate Solves

AI agents can be useful because they can take action, not just answer questions. They might issue refunds, send customer emails, update CRM records, change database rows, or trigger workflows.

That also creates risk. A company should not let AI agents freely touch production systems without controls. AgentGate adds those controls:

- Agent registry
- API key access
- Risk scoring
- Policies
- Human approvals
- Audit logs
- Kill switches
- Demo tool execution

## 3. What An AI Agent Is

An AI agent is software that can decide to perform tasks on behalf of a user, team, or business process. In the AgentGate demo, the main example is the Support Refund Agent.

The Support Refund Agent asks to create a $1,200 production refund. AgentGate checks the risk, applies the refund policy, creates an approval request, and records the audit trail.

## 4. What An Action Request Is

An action request is the record of what an AI agent wants to do.

An action request usually includes:

- Agent
- Tool
- Action
- Environment
- Amount and currency when money is involved
- Reason
- Payload
- Metadata
- Risk assessment
- Policy decision
- Approval status if approval is required

Example:

```json
{
  "agentId": "support-refund-agent",
  "tool": "stripe",
  "action": "refund.create",
  "environment": "production",
  "amount": 1200,
  "currency": "USD",
  "reason": "Customer was double charged"
}
```

## 5. What Decisions Mean

AgentGate decisions describe what should happen to a requested action.

### ALLOW

The action is allowed. In V1, execution is still simulated only.

### REQUIRE_APPROVAL

The action is not allowed to proceed automatically. AgentGate creates an approval request for a reviewer or eligible role.

### BLOCK

The action is blocked. This can happen because of policy, a paused agent, the organization kill switch, or a high-risk destructive action.

### LOG_ONLY

The action is allowed and recorded. This is useful for lower-risk actions that still need an audit trail.

### SANDBOX_ONLY

The action is allowed only in a sandbox-style context. In V1 this is a policy decision type for future expansion and safe demo behavior.

## 6. What Risk Levels Mean

AgentGate V1 calculates risk locally using deterministic rules. It looks at signals such as money movement, production environment, irreversible actions, sensitive data, database writes, delete actions, refund actions, and agent risk tier.

### NONE

No meaningful risk signals were found.

### LOW

The action has limited risk. Example: an internal notification with no money movement and no production change.

### MEDIUM

The action has some risk signals and should be reviewed in context.

### HIGH

The action has strong risk signals, such as money movement, production impact, or sensitive data.

### CRITICAL

The action is highly risky or destructive, such as deleting customer data in production.

## 7. How To Log In

Open the local app and go to `/login`.

Demo credentials:

- Owner: `owner@agentgate.dev` / `Password123!`
- Reviewer: `reviewer@agentgate.dev` / `Password123!`
- Auditor: `auditor@agentgate.dev` / `Password123!`
- Platform owner, if seeded: `platform@agentgate.dev` / `Password123!`

Human login uses email and password with httpOnly session cookies. API keys are not used for human login.

## 8. How To Read The Dashboard

The dashboard gives a quick view of the current organization.

Look for:

- Total agents
- Active agents
- Actions today
- Pending approvals
- Blocked actions
- High-risk actions
- Critical actions
- Kill switch status
- Recent approvals
- Recent blocked actions
- Top risky agents
- Recent audit activity

All dashboard data should be scoped to the current organization.

## 9. How To Manage Agents

Go to `/agents`.

The Agents page shows registered AI agents, including:

- Name
- Department
- Owner
- Status
- Risk tier
- Allowed tools
- Actions today
- Last activity

Users with the right role can create, edit, pause, resume, or delete agents. Auditors can view but should not manage agents.

## 10. How To Pause An Agent

Pausing an agent is a local kill switch for that specific AI agent.

To pause an agent:

1. Go to `/agents`.
2. Open the agent detail page.
3. Use the pause action.
4. Send the same gateway request again.

When the Support Refund Agent is paused, the $1,200 refund request should return `BLOCK`.

## 11. How To Create Policies

Go to `/policies`.

Policies tell AgentGate what to do when an action matches certain conditions. A policy can allow, block, log, require approval, or restrict an action to sandbox behavior.

Examples:

- Refunds above $500 require approval.
- Delete actions are blocked.
- External customer emails require approval.
- Production database writes require approval.
- Internal Slack messages are allowed.

In V1, policy creation is practical and lightweight. The rule builder includes assisted fields and JSON conditions rather than a complex visual editor.

## 12. How To Review Approvals

Go to `/approvals`.

The Approval Inbox shows action requests that need human review. A reviewer can inspect:

- Agent
- Tool
- Action
- Environment
- Risk score
- Risk level
- Risk signals
- Risk explanation
- Matched policy
- Payload
- Metadata
- Comments
- Activity timeline

Eligible reviewers can approve or reject. Approving updates the action request to approved. Rejecting updates it to rejected. Both actions create audit logs.

## 13. How To Read Audit Logs

Go to `/audit-logs`.

Audit logs show the trail of important events, such as:

- User login and logout
- Agent created, updated, paused, resumed, or deleted
- API key created or revoked
- Gateway action checked
- Action blocked
- Approval requested
- Approval approved or rejected
- Simulated execution
- Kill switch changes

Audit logs are scoped to the current organization. They should not expose full API keys or secrets.

## 14. How To Use API Keys Safely

Go to `/developer/api-keys`.

API keys are used by AI agents and developers to call the gateway. They are not used for human login.

Safety rules:

- The full key is shown only once immediately after creation.
- AgentGate stores only a hash of the key.
- The displayed prefix is for identification only.
- Do not paste API keys into screenshots, support tickets, or public docs.
- Revoke keys that are no longer needed.
- Scope keys to an agent when practical.

The seeded demo key is local-only and intended for the V1 demo:

```text
ag_test_seed_support_refund_demo_key
```

Do not use the seeded demo key in real production.

## 15. How The Kill Switch Works

AgentGate has two useful kill-switch concepts in V1:

- Agent pause: blocks requests from one agent.
- Organization kill switch: blocks gateway actions across the organization.

To test the organization kill switch:

1. Log in as an owner or security admin.
2. Go to `/settings`.
3. Enable the kill switch.
4. Send a gateway request.
5. AgentGate should return `BLOCK`.
6. Disable the kill switch to resume the demo.

## 16. What Demo Integrations Mean

V1 includes demo integrations so viewers can understand the product flow without real external side effects.

Demo integrations include:

- Slack Demo
- Stripe Test Mode
- Email Preview
- Postgres Demo
- Webhook Demo

These integrations are simulated only. V1 does not perform real refunds, send real messages, write real business records, or call real external URLs by default.

## 17. What V1 Does Not Do Yet

AgentGate V1 is intentionally focused on the core safety flow. It does not yet provide:

- Real Stripe billing
- Real Stripe refunds
- Real Gmail or Slack delivery
- Real production database writes
- Real outbound webhook delivery by default
- Paid AI model review
- Full MCP server implementation
- SOC 2 certification
- Enterprise SSO
- Full production incident response workflows

The V1 goal is to prove the safety, approval, and audit workflow clearly.

## 18. Recommended Demo Script

Use this script for a non-technical demo:

1. Log in as `owner@agentgate.dev` with `Password123!`.
2. Open the Dashboard.
3. Point out pending approvals, high-risk actions, blocked actions, and kill switch status.
4. Go to Agents.
5. Open Support Refund Agent.
6. Show its status, allowed tools, risk tier, and recent actions.
7. Go to Policies.
8. Show the policy: Refunds above $500 require approval.
9. Go to Developer Docs or the guided demo page.
10. Send the gateway curl request for a $1,200 production refund.
11. Show that AgentGate returns `REQUIRE_APPROVAL`.
12. Go to the Approval Inbox.
13. Open the new approval.
14. Show risk signals, policy reason, payload, comments, and timeline.
15. Approve or reject the request.
16. Go to Audit Logs.
17. Show the full trail.
18. Go back to Agents and pause Support Refund Agent.
19. Send the same gateway request again.
20. Show that AgentGate returns `BLOCK` because the agent is paused.

Optional final step:

1. Go to Settings.
2. Enable the organization kill switch.
3. Send another gateway request.
4. Show that organization-level controls block the request.
5. Disable the kill switch before ending the demo.

## Helpful Routes

- `/demo`: Guided customer demo
- `/login`: Demo login
- `/dashboard`: Organization overview
- `/agents`: Agent registry
- `/policies`: Policy management
- `/approvals`: Approval inbox
- `/audit-logs`: Audit logs
- `/developer`: Developer home
- `/developer/api-keys`: API key management
- `/developer/docs`: Developer docs
- `/settings`: Organization settings

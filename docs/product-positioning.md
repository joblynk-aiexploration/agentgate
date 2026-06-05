# AgentGate Product Positioning

## One-Line Pitch

AgentGate is the safety, approval, and audit layer for AI agents.

## Short Paragraph

AgentGate lets companies safely deploy AI agents by controlling what every AI agent can access, change, spend, send, approve, and execute. Instead of giving agents direct access to business tools, teams route sensitive actions through AgentGate for local risk scoring, policy decisions, human approvals, kill switches, and audit logs.

## Bullet Pitch

- AI agents are moving from chat to action.
- Action creates risk when agents touch production tools.
- AgentGate gives every agent a governed gateway.
- Policies decide what is allowed, blocked, logged, or sent to approval.
- Risk scoring highlights money movement, production changes, sensitive data, destructive actions, and other signals.
- Human reviewers approve or reject high-risk actions.
- Audit logs preserve the trail.
- Kill switches stop unsafe agents quickly.
- V1 uses local rules and demo integrations only.

## Target Customer

Early target customers:

- AI automation agencies
- SaaS teams adding AI agents
- Support automation teams
- Fintech, legal, healthcare, and compliance-sensitive AI builders
- Internal platform teams experimenting with agentic workflows

Best first wedge:

> Teams that want AI agents to perform operational actions, but need approvals and audit logs before those actions reach production tools.

## Wedge

Start with high-risk support and operations workflows:

- Refunds
- Customer emails
- CRM updates
- Database writes
- Webhook-triggered workflows

The Support Refund Agent demo is a strong wedge because the risk is obvious:

```text
Support Refund Agent wants to refund $1,200 -> AgentGate scores risk -> Policy requires approval -> Reviewer approves -> Audit log records the trail.
```

## Competitors And Alternatives

Potential alternatives:

- Build internal approval workflows
- Hard-code rules inside each AI agent
- Use generic API gateways
- Use existing IAM tools
- Use workflow automation tools
- Use observability or logging tools after the fact
- Avoid giving agents tool access at all

AgentGate is different because it is designed around AI-agent actions:

- Agent identity
- Tool and action context
- Local risk scoring
- Policy decisions
- Approval inbox
- Kill switches
- Audit logs
- Developer API and tool proxy modes

## Differentiation

Key differentiation:

- Focused on AI-agent action governance, not generic workflow automation.
- Works before action execution, not only after-the-fact logging.
- Combines risk, policy, approval, and audit in one control loop.
- Keeps V1 local and deterministic instead of depending on paid AI APIs.
- Makes demo integrations safe by simulating execution.
- Helps teams prove that an AI agent did not bypass controls.

## What Not To Claim

Do not claim:

- AgentGate is SOC 2 certified.
- AgentGate executes real Stripe, Gmail, Slack, Postgres, or webhook actions in V1.
- AgentGate trains AI models.
- AgentGate uses paid AI APIs in V1.
- AgentGate replaces IAM, SIEM, or full compliance systems.
- AgentGate is production hardened for regulated enterprise deployment without further review.
- AgentGate prevents every possible AI-agent failure.

Safer phrasing:

- V1 is a demo of the core control loop.
- V1 uses local deterministic rules.
- V1 demo integrations are simulated.
- AgentGate is designed to become the governed gateway for AI-agent actions.


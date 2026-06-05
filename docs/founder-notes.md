# AgentGate Founder Notes

## What AgentGate Is

AgentGate is the safety, approval, and audit layer for AI agents.

It gives companies a governed gateway between AI agents and business tools:

```text
AI Agent -> AgentGate Gateway API -> Local Safety Engine -> Policy Decision -> Approval Inbox -> Audit Log
```

The core promise is simple: AI agents should not get unrestricted access to production systems.

## Why Now

AI agents are moving from chat into action. They can draft and send emails, issue refunds, update CRMs, change database records, trigger workflows, and make operational decisions.

That creates a gap for companies:

- AI agents are useful only if they can take action.
- Production action creates business, security, legal, and compliance risk.
- Existing observability and access-control tools were not designed around autonomous agent behavior.
- Teams need a practical control layer before deploying agents into sensitive workflows.

AgentGate sits in that gap.

## Target Users

Primary early users:

- AI automation agencies building agents for clients
- SaaS founders adding AI agents to workflows
- Support automation teams
- Fintech, legal, healthcare, and compliance-sensitive AI builders
- Internal platform teams experimenting with agentic workflows

Economic buyer candidates:

- CTO
- Head of Engineering
- Head of Support Operations
- Security lead
- Compliance lead
- Founder of an AI automation agency

## V1 Scope

V1 focuses on the core demo loop:

1. Register an AI agent.
2. Give it an API key.
3. Send a sensitive gateway request.
4. Score the request with local rules.
5. Apply policy.
6. Require approval if needed.
7. Let a reviewer approve or reject.
8. Record the audit trail.
9. Block requests when the agent or organization kill switch is active.

V1 is intentionally lightweight around billing, integrations, reports, platform administration, and advanced settings.

## What Is Simulated

V1 demo integrations are simulated:

- Stripe Test Mode refund simulation
- Email Preview simulation
- Slack Demo simulation
- Postgres Demo simulation
- Webhook Demo simulation

No real refunds, emails, Slack posts, database writes, or outbound webhook calls happen by default.

## What Is Not Built Yet

Do not claim these are complete:

- Real external tool execution
- Real Stripe billing
- Production webhook delivery by default
- Paid AI model review
- SOC 2 certification
- Enterprise SSO
- Full incident management
- Full MCP server
- Customer-hosted policy packs
- Full analytics warehouse

## Roadmap

Near-term roadmap:

1. Sharpen one or two vertical workflows, likely support refunds or regulated customer communications.
2. Add safer production webhook delivery with customer-controlled opt-in.
3. Add richer approval routing and escalation.
4. Add SDK packaging and examples for agent frameworks.
5. Add integration-specific policy templates.
6. Add stronger audit export and compliance workflows.
7. Add organization onboarding for real pilot users.
8. Explore MCP gateway mode after the API gateway and tool proxy are validated.

## Demo Truths To Repeat

- V1 uses local deterministic rules.
- V1 does not use paid AI APIs.
- V1 does not execute real external actions.
- The seeded demo API key is local-only.
- The product is strongest when shown as a control plane, not as another agent builder.


# AgentGate MCP Gateway Placeholder

AgentGate can later expose controlled tools to MCP-compatible AI agents, but V1
does not run a full MCP server.

## Intended Architecture

```text
AI Agent -> MCP Client -> AgentGate MCP Gateway -> Policy/Risk/Approval -> Tool Executor
```

The enterprise safety boundary stays inside AgentGate:

- AI agents should not receive direct credentials to Stripe, Gmail, Slack,
  Postgres, webhooks, or other business tools.
- MCP tool calls should flow through AgentGate API key authentication, tenant
  isolation, local risk scoring, policy decisions, human approvals, simulated or
  controlled tool execution, and audit logs.
- Policy and approval behavior should match the existing Gateway API and Tool
  Proxy mode so customers get one consistent control plane.

## V1 Behavior

V1 supports:

- Gateway API: `POST /api/gateway/check`, then `execute` or `cancel`.
- Tool Proxy mode: `POST /api/tool-proxy/[tool]/[action]`.
- Local deterministic risk and policy logic.
- Demo-only simulated executors.

V1 intentionally does not:

- Run an MCP server.
- Add external MCP dependencies.
- Give AI agents direct credentials to business tools.
- Call real Stripe, Gmail, Slack, Postgres, webhook, or external systems.

## Future Notes

A future MCP implementation should keep the same safety guarantees as the V1
gateway:

- Validate every tool input with Zod or equivalent schema validation.
- Authenticate every call.
- Scope every tenant-owned lookup by `organizationId`.
- Hash and protect secrets.
- Create audit logs for tool listing, tool decisions, approvals, blocks, and
  executions.
- Route execution through controlled tool executors, not direct agent-owned
  credentials.

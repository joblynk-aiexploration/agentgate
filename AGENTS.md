# AgentGate Agent Instructions

## Project

AgentGate is an enterprise-grade multi-tenant SaaS product: “the safety, approval, and audit layer for AI agents.”

Core architecture:

AI Agent → AgentGate Gateway API → Local Safety Engine → Policy Decision → Approval Inbox → Audit Log

## V1 Product Goal

Build a working SaaS demo where:

1. Support Refund Agent requests a $1,200 production refund.
2. AgentGate scores it HIGH risk.
3. Policy requires approval for refunds above $500.
4. An approval request appears in the approval inbox.
5. A reviewer can approve or reject the request.
6. Audit logs record the full trail.
7. If the agent is paused, the same request returns BLOCK.

## Engineering Rules

1. Do not use OpenAI, Anthropic, Gemini, or paid AI APIs in V1.
2. The AgentGate Safety Engine must be local TypeScript code.
3. Use deterministic rules, risk scoring, policy checks, approval logic, and audit logs.
4. Use Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM, and Zod.
5. Every organization-owned model must include organizationId.
6. Every server query must enforce tenant isolation.
7. Never trust client-side permissions.
8. Validate all API inputs with Zod.
9. Hash API keys before storing them.
10. Never expose full API keys after creation.
11. Create audit logs for important actions.
12. Use httpOnly cookies for human sessions.
13. Do not use API keys for human login.
14. Keep V1 focused on Agents → API Keys → Gateway Check → Risk → Policy → Approval → Audit Logs.
15. Keep billing, reports, integrations, and advanced settings usable but lightweight.
16. Do not create real Stripe, Gmail, Slack, or database side effects in V1. Simulate execution only.
17. Do not make unrelated changes.
18. After changes, run type-check, lint, and build if available.
19. Explain what files changed and why.
20. Be honest about commands that could not run.

## Done Means

A task is not done until:
- TypeScript passes or errors are documented.
- Lint passes or errors are documented.
- Build passes or errors are documented.
- Important flows have server-side authorization.
- Tenant-owned queries include organizationId.
- User-facing docs are updated when behavior changes.

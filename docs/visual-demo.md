# AgentGate Visual Demo

This walkthrough is for reviewing AgentGate when you cannot access the local
Codex dev server directly. The screenshots live in `docs/screenshots/` and show
the V1 demo running against seeded local data.

## Demo Credentials

- Owner: `owner@agentgate.dev` / `Password123!`
- Reviewer: `reviewer@agentgate.dev` / `Password123!`
- Auditor: `auditor@agentgate.dev` / `Password123!`
- Developer: `developer@agentgate.dev` / `Password123!`

## Screenshot Guide

1. `01-landing.png` - Public landing page explaining AgentGate as the safety,
   approval, and audit layer for AI agents.
2. `02-login.png` - Login page with the final seeded demo credentials.
3. `03-dashboard.png` - Owner dashboard with tenant-scoped demo metrics.
4. `04-agents.png` - Agent registry showing demo agents and their status/risk.
5. `05-support-refund-agent.png` - Support Refund Agent detail page with tools,
   recent actions, and control surface.
6. `06-policies.png` - Policies list including the refund approval policy.
7. `07-agent-lab.png` - Browser Agent Lab with runnable Support Operations Agent
   scenarios.
8. `08-large-refund-decision.png` - Large refund scenario result showing
   `REQUIRE_APPROVAL`, risk score, signals, action ID, and approval ID.
9. `09-approvals.png` - Approval Inbox with pending approval requests.
10. `10-approval-detail-pending.png` - Pending approval detail before reviewer
    action.
11. `11-reviewer-approval.png` - Reviewer approval page before clicking
    Approve.
12. `12-approval-approved.png` - Approval detail after the real reviewer UI
    approval.
13. `13-audit-logs.png` - Audit Logs showing `approval.approved` and
    `gateway.action_executed`.
14. `14-settings.png` - Organization settings and kill-switch controls.
15. `15-billing.png` - Placeholder V1 billing/pricing display.
16. `16-role-restriction-auditor.png` - Auditor can view the approval but cannot
    approve it.
17. `17-role-restriction-developer.png` - Developer cannot access the approval
    review surface.
18. `18-developer-docs.png` - Developer Docs for Gateway API, Tool Proxy, Agent
    Lab, SDK starter, and future integration notes.

## What the Large Refund Flow Proves

The Support Operations Agent asks to run `stripe/refund.create` for a $1,200
production refund. AgentGate authenticates the API key, resolves the agent
inside the current organization, scores local deterministic risk, applies the
policy requiring approval for refunds above $500, creates an ApprovalRequest,
and writes audit logs. A reviewer then approves through the real browser UI.
Only after approval does the gateway allow the safe simulated execute call.

## What the Blocked Delete Flow Proves

The demo includes a destructive customer delete scenario. AgentGate identifies
the production delete action as critical and blocks it. The agent does not
execute anything. This validates the V1 pattern for destructive or irreversible
AI-agent actions.

## What Approval Restrictions Prove

The screenshots show role behavior:

- Reviewers can approve eligible approval requests.
- Auditors can inspect approvals but cannot approve.
- Developers cannot use the approval review surface unless role policy changes.

These UI states are only for usability. Server-side authorization remains the
source of truth.

## What Audit Logs Prove

Audit logs record the major trail: gateway check, approval requested, approval
approved, and action executed. The logs are scoped to the current organization
and redact sensitive metadata. Full API keys are not shown.

## What Is Simulated in V1

V1 uses demo executors only. Stripe refunds, emails, Slack messages, Postgres
writes, webhooks, and other business-tool actions are simulated. The app is
designed to prove the safety, policy, approval, and audit control loop without
creating real external side effects.

## What V1 Does Not Use

AgentGate V1 does not use OpenAI, Anthropic, Gemini, or paid AI APIs. The safety
engine is local deterministic TypeScript code.

## What V1 Does Not Call

AgentGate V1 does not call real Stripe, Gmail, Slack, Postgres business systems,
or external webhooks during the demo. The gateway execute step returns safe
simulated execution results only.

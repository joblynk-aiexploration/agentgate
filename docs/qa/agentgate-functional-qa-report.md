# AgentGate Functional QA Report

## Gateway

Result: Passed in integration tests.

The commerce agent and support-agent flows use AgentGate as the gateway before simulated business actions. Tests verified `REQUIRE_APPROVAL` and blocked/destructive behavior without real external side effects.

## Risk And Policy

Result: Passed in unit and integration tests.

High-risk refund and destructive customer-delete scenarios triggered appropriate risk/policy outcomes. No paid AI APIs were used.

## Approvals

Result: Passed in browser UI path.

Direct helper/API-based approval flows and real browser approval flows now update `ApprovalRequest` and `ActionRequest` records correctly when tested through `localhost`.

## Audit Logs

Result: Passed in the tested flows.

Audit logs were generated for commerce action checks, blocked actions, approval approvals, and simulated executions.

## Kill Switch And Pause Behavior

Result: Passed after running the expected support-agent scenario chain. The verifier still needs clearer prerequisite handling after a clean reset.

## Demo State

Result: Passed after Docker Postgres was started.

`demo:reset` and `demo:check` restored and verified Acme AI Operations data.

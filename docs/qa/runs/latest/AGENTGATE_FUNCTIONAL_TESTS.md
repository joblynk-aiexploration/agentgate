# AgentGate Functional Tests

## Gateway and Risk/Policy

Tested through scripts and browser flows:

- Small refund: approval required because current demo risk/policy config treats payment/refund production actions as high risk.
- Large $1,200 refund: `REQUIRE_APPROVAL`.
- Customer delete: `BLOCK`.
- External email: approval required.
- Production database write: approval required.
- Paused agent: `BLOCK`.
- Organization kill switch: `BLOCK`.

## Approval and Execution

- Large refund created an `ApprovalRequest`.
- Reviewer approved through the real UI.
- `ActionRequest` changed to `APPROVED`.
- Safe demo execute changed action to `EXECUTED`.
- Audit logs include approval and execution evidence.

## Audit and Inspection

- Action detail API contains audit timeline evidence.
- Audit logs exist for checked actions, blocked actions, approval requested, approval approved, and action executed.

## Evidence

- `support-agent-verifier.log`
- `e2e-rerun.log`
- `tests/e2e/approval-flow.spec.ts`
- `tests/e2e/qa-agentgate-core-flows.spec.ts`

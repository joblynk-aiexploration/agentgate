# AgentGate Role Tests

## Accounts Tested

- `owner@agentgate.dev`
- `security@agentgate.dev`
- `developer@agentgate.dev`
- `reviewer@agentgate.dev`
- `auditor@agentgate.dev`
- `platform@agentgate.dev`

## Browser Coverage

Each account logged in through the real `/login` page and reached expected role surfaces. The logout route was exercised after each account.

## Authorization Checks

- Unauthenticated users are redirected away from protected app pages.
- Reviewer can approve an eligible approval.
- Auditor cannot approve in the approval detail flow.
- Developer cannot approve in the approval detail flow.
- Platform owner can reach platform surfaces.

## Evidence

- `tests/e2e/full-role-login-qa.spec.ts`
- `tests/e2e/qa-all-agentgate-accounts.spec.ts`
- `tests/e2e/qa-agentgate-core-flows.spec.ts`
- Screenshots: `agentgate-role-*.png`

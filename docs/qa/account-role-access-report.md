# Account And Role Access Report

## Seeded Accounts Tested

| Account | Expected Role | Result |
| --- | --- | --- |
| `owner@agentgate.dev` | `org_owner` | Login passed; app pages loaded. |
| `security@agentgate.dev` | `security_admin` | Login passed; app pages loaded. |
| `developer@agentgate.dev` | `developer` | Login passed; app pages loaded. |
| `reviewer@agentgate.dev` | `reviewer` | Login passed; app pages loaded. |
| `auditor@agentgate.dev` | `auditor` | Login passed; app pages loaded. |
| `platform@agentgate.dev` | `platform_owner` | Login passed; platform page loaded. |

## Findings

### HIGH: Reviewer Approval UI Does Not Reliably Persist Approval

Why it matters: approval is the centerpiece of the product demo. If a reviewer clicks Approve and the records remain pending, the buyer sees a broken control plane.

Evidence: `tests/e2e/approval-flow.spec.ts`, `tests/e2e/customer-checkout-agentgate-flow.spec.ts`, and `tests/e2e/demo-commerce-api-key-bridge.spec.ts` failed because records remained `PENDING` / `PENDING_APPROVAL` after clicking the real UI.

Fix now or later: fix now before any external demo. The API authorization path should also get a regression test that proves reviewer approval updates both `ApprovalRequest` and `ActionRequest`.

### Passed: Unauthenticated Redirect

Unauthenticated access to `/dashboard` redirected to `/login`.

### Passed: Admin Separation In Northstar

Customer account sessions could not directly open Northstar admin routes.


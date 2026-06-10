# Master QA Report

Date: 2026-06-09

## Verdict

AgentGate V1 is strong enough for internal founder testing, guided local demos, and controlled customer-facing walkthroughs. It remains demo software, not production software.

## Ready To Show?

| Audience | Verdict | Reason |
| --- | --- | --- |
| Personal testing | Yes | Core app, commerce demo, reset scripts, and monitor mostly work. |
| Friends/advisors | Yes | The main ecommerce and AgentGate governance flows pass E2E. |
| Serious customer demo | Yes, controlled | Approval UI, ecommerce cancellation approval, execution, and audit evidence now pass in browser tests. |
| Production | No | V1 is local/demo, simulated integrations, and no production hardening guarantee. |

## Approval UI Persistence Fix

Root cause: the original failing E2E runs used `127.0.0.1` for local browser automation while the Next.js dev server and app configuration expected `localhost`. In that mode, the approval detail page rendered, but the client-side approval button did not hydrate correctly, so clicking Approve did not send `POST /api/approvals/[id]/approve`. The database stayed at `ApprovalRequest.status=PENDING` and `ActionRequest.status=PENDING_APPROVAL`.

Files changed for the fix:

- `playwright.config.ts`: defaults local E2E to `http://localhost:3001`, reusing the normal local demo server when it is already running.
- `next.config.ts`: allows both `localhost` and `127.0.0.1` for local dev websocket/connect origins.
- `apps/demo-commerce-store/src/lib/store.ts`: defaults the Northstar AgentGate URL to `http://localhost:3001`.
- `tests/e2e/approval-flow.spec.ts`: verifies owner/security approval API paths, auditor/developer denial, reviewer UI approval, action status, audit log, and safe execution.
- `tests/e2e/customer-checkout-agentgate-flow.spec.ts`: verifies Northstar cancellation approval through the real AgentGate reviewer UI.
- `tests/e2e/demo-commerce-api-key-bridge.spec.ts`: verifies a created AgentGate API key can bridge Northstar, create approvals, approve through UI, and show audit evidence.
- `apps/demo-commerce-store/src/server/agent/agentgate-sync.ts`: skips stale local cancellation action IDs from old demo state instead of aborting a valid approved sync.
- `apps/demo-commerce-store/tests/commerce.test.ts`: covers stale AgentGate action IDs plus one valid approved cancellation sync.

Before behavior: the UI appeared clickable, but no approval POST happened in the failing browser runs, leaving records pending.

After behavior: reviewer UI approval sends the real API request, updates both `ApprovalRequest` and `ActionRequest` to `APPROVED`, records `approval.approved`, disables the reviewed action state, and allows safe simulated execution.

Regression coverage:

- `npx playwright test tests/e2e/approval-flow.spec.ts`
- `npm run test:e2e`
- `npm run commerce:test`
- `npm run verify:commerce-checkout-agent`

Final status: fixed for local V1 demo and covered by browser E2E. This does not change the production readiness verdict; V1 remains demo software with simulated integrations.

## Issues Found

### FIXED: Real Reviewer Approval UI Did Not Persist Approval

Why it matters: AgentGate sells approval controls. If the reviewer click path fails, the core demo breaks.

Evidence: Full Playwright E2E previously failed in approval-related specs because records stayed `PENDING` / `PENDING_APPROVAL` after clicking the UI. The root cause was local QA using `127.0.0.1`, which prevented Next dev hydration from wiring the client button.

Latest full-suite count: 16 Playwright tests passed.

Fix: Playwright and Northstar demo config now default to `localhost`, and Next dev configuration allows both `localhost` and `127.0.0.1` connect/websocket origins.

Fix now or later: Fixed now. Keep E2E regression coverage.

### MEDIUM: Commerce Verification Scripts Are Not Self-Isolating

Why it matters: QA commands fail depending on run order.

Fix: Make each verifier create/reset its own fixtures or use unique test orders.

Fix now or later: Soon.

### MEDIUM: Agent Integration Verifier Requires Scenario Prerequisites

Why it matters: Running it immediately after `demo:reset` fails even though the integration passes after scenario setup.

Fix: Have the verifier either run prerequisites or clearly print the missing prerequisite commands.

Fix now or later: Soon.

### MEDIUM: npm Audit Moderate Vulnerabilities

Why it matters: Enterprise buyers will ask about dependency hygiene.

Fix: Review and upgrade dependencies without using force upgrades blindly.

Fix now or later: Soon.

### MEDIUM: Demo Screenshot E2E Flakiness

Why it matters: visual proof generation can fail under suite state/timing.

Fix: Reset fixtures inside screenshot spec and wait on stable UI markers.

Fix now or later: Later unless screenshots are needed for a live sales package.

### FIXED: Local Dev-Origin Warning

Why it matters: noisy local QA.

Fix: Playwright now defaults to `localhost`, and Next.js dev configuration allows both `localhost` and `127.0.0.1`.

Fix now or later: Fixed in the follow-up ecommerce/demo-readiness pass.

### LOW: Commerce Workspace-Root Warning

Why it matters: noisy build output.

Fix: set the workspace root explicitly or align lockfile strategy.

Fix now or later: Later.

### LOW: Dev Hydration Warnings On Commerce Admin Forms

Why it matters: dev console polish.

Fix: reproduce in a clean browser and remove the cause if app-generated.

Fix now or later: Later.

## What Was Fixed During This QA Pass

- Added browser QA coverage for all seeded AgentGate roles.
- Added browser QA coverage for the Northstar -> AgentGate commerce integration.
- Adjusted QA tests so safe prompt-injection refusal is accepted as a pass rather than requiring an approval.
- Verified that normal cancellation requests create AgentGate approvals.
- Fixed local QA host consistency so browser approval buttons hydrate and persist actions correctly.
- Added this structured QA evidence package.

## What Was Intentionally Left

- Dependency audit remediation was left for a controlled package update pass.
- Verification script isolation was documented rather than hidden by always running commands in a lucky order.

## Demo Checklist

1. Start Docker Postgres.
2. Run `npm run demo:reset`.
3. Run `npm run demo:check`.
4. Start AgentGate on port `3001`.
5. Start Northstar on port `3004`.
6. Login as owner.
7. Show dashboard, agents, policies, ecommerce monitor, and audit logs.
8. Use Northstar chat to request a cancellation and show AgentGate `REQUIRE_APPROVAL`.
9. Approve through the reviewer UI and verify action execution plus audit logs.

## Final Recommendation

AgentGate is ready for a controlled V1 demo. Before production or a higher-stakes enterprise evaluation, clean up verifier isolation, dependency audit findings, and deployment hardening.

# Master QA Report

Date: 2026-06-09

## Verdict

AgentGate V1 is strong enough for internal founder testing and guided local demos. It is not yet ready for a high-stakes customer demo until the real browser approval UI bug is fixed.

## Ready To Show?

| Audience | Verdict | Reason |
| --- | --- | --- |
| Personal testing | Yes | Core app, commerce demo, reset scripts, and monitor mostly work. |
| Friends/advisors | Yes, with script discipline | Use known flows and be ready to avoid the broken approval UI path. |
| Serious customer demo | Not yet | Approval UI persistence failure can break the central product story. |
| Production | No | V1 is local/demo, simulated integrations, and no production hardening guarantee. |

## Issues Found

### HIGH: Real Reviewer Approval UI Does Not Persist Approval

Why it matters: AgentGate sells approval controls. If the reviewer click path fails, the core demo breaks.

Evidence: Full Playwright E2E failed in approval-related specs. Records stayed `PENDING` / `PENDING_APPROVAL` after clicking the UI.

Latest full-suite count: 12 Playwright tests passed and 4 failed. Three failures are approval-related and one is a screenshot timeout.

Fix: Refactor approval actions to a deterministic submit path, add explicit loading/success/error UI, and keep E2E regression coverage.

Fix now or later: Now.

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

### LOW: Local Dev-Origin Warning

Why it matters: noisy local QA.

Fix: Use `localhost` consistently or configure `allowedDevOrigins`.

Fix now or later: Later.

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
- Added this structured QA evidence package.

## What Was Intentionally Left

- The approval UI product bug was documented, not patched blindly. It is security-critical and needs a focused fix with regression coverage.
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
9. Avoid depending on the reviewer approval UI until the high-severity bug is fixed.

## Final Recommendation

Fix the approval UI persistence issue before showing AgentGate to a serious buyer. After that, rerun the full E2E suite and both commerce verifiers with reset isolation.

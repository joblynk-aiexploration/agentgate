# Bugs and Findings

## Fixed Now

### HIGH - Northstar return policy prompt routed to order mutation path

Why it matters: A customer asking “What is your return policy?” should receive informational policy copy, not an ownership-gated return-request workflow. That confusion makes the assistant look unsafe and unreliable.

Fix: Moved policy/privacy/shipping intent routing before transactional return handling in `apps/demo-commerce-store/src/server/agent/intent-router.ts`.

Status: Fixed and covered by `qa-commerce-agent-chat.spec.ts`.

### HIGH - Sensitive customer email request returned generic fallback

Why it matters: “Show me all customer emails” should get an explicit privacy refusal. Generic fallback could look like the assistant failed to recognize a sensitive-data request.

Fix: Routed customer email/customer data/all-customer prompts to policy/privacy handling and returned a clear refusal from `store-knowledge.ts`.

Status: Fixed and covered by `qa-commerce-agent-chat.spec.ts`.

### MEDIUM - Commerce QA E2E files existed outside root Playwright discovery

Why it matters: Tests sitting under `apps/demo-commerce-store/tests/e2e` were not run by root Playwright config when invoked normally.

Fix: Added root wrapper specs in `tests/e2e/` so the app-specific specs run in `npm run test:e2e`.

Status: Fixed. Full E2E now runs 30 tests.

### LOW - Brittle QA assertions/timeouts

Why it matters: The QA suite should fail on product bugs, not on heading copy or a too-short timeout for a screenshot sweep.

Fixes:

- Account orders test accepts the actual heading “Your order history.”
- AgentGate page screenshot sweep timeout increased to 120 seconds.

Status: Fixed.

## Left For Later

### MEDIUM - Dependency audit warnings

Evidence: `npm install` reported 5 moderate vulnerabilities in root dependencies; commerce install reported 2 moderate vulnerabilities.

Fix later: Run a controlled dependency audit, inspect advisories, and upgrade without breaking Next/Playwright/Prisma.

### LOW - Next workspace-root warning in commerce build

Evidence: `npm run commerce:build` warns that Next detected multiple lockfiles and inferred the workspace root.

Fix later: Configure `turbopack.root` or rationalize nested lockfiles after deciding whether the commerce app remains independently installable.

### LOW - Some verifiers require reset prerequisites

Evidence: Baseline commerce verifiers failed when run after mutated state. They pass after `npm run commerce:reset`.

Fix later: Make verifier scripts self-reset or isolate their test state.

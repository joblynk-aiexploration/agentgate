# Full QA Run

Date: 2026-06-09

Scope: AgentGate V1 plus the Northstar Outdoor Supply demo commerce app.

## What Was Tested

- AgentGate public pages, authentication, role-based app access, dashboard, agents, policies, approvals, actions, audit logs, integrations, developer docs, Agent Lab, settings, reports, billing, and ecommerce monitor.
- Northstar public storefront, customer login/account/order tracking, admin login/orders/fulfillment/API config/agent logs, and support chat.
- End-to-end integration between Northstar chat actions and AgentGate gateway, risk, policy, approvals, audit logs, and ecommerce monitor.
- Seed/reset reliability, local Postgres connectivity, builds, unit tests, type-check, lint, and browser smoke coverage.
- API key exposure risks in client-visible code, docs, screenshots, and demo configuration.

## Environment

- AgentGate: `http://localhost:3001`
- Northstar commerce demo: `http://localhost:3004`
- Database: local Docker Postgres container `agentgate-postgres`, mapped to `localhost:55432`
- Node path used in QA shell: `/Users/rm/.codex/tools/node-v24.16.0-darwin-arm64/bin`

## Executive Result

AgentGate V1 is functional enough for internal demo, founder walkthroughs, and a controlled customer-facing demo.

The gateway, risk engine, policy engine, audit logging, tenant-scoped monitor, Northstar chat integration, simulated tool behavior, and real browser reviewer approval flow work in automated tests. A previous approval UI failure was root-caused to local QA using `127.0.0.1`, which prevented Next dev hydration from wiring client actions. Local QA now defaults to `localhost`, and full E2E passes.

## Severity Summary

| Severity | Count | Summary |
| --- | ---: | --- |
| CRITICAL | 0 | No confirmed secret leakage, real external side effects, or cross-tenant data access was found in this pass. |
| HIGH | 0 | The reviewer approval UI issue was fixed and covered by E2E. |
| MEDIUM | 3 | Verification isolation gaps, scenario prerequisites, and npm audit findings remain. |
| LOW | 2 | Workspace-root warning and local build artifacts in file scans remain. |

## Commands Run

- `pwd`
- `git status --short --branch`
- `git log -1 --oneline`
- `npm install`
- `npx prisma generate`
- `npm run test`
- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run commerce:install || true`
- `npm run commerce:test`
- `npm run commerce:build`
- `npm run demo:check`
- `docker start agentgate-postgres || true`
- `docker ps --filter name=agentgate-postgres`
- `npx prisma migrate dev`
- `npm run demo:reset`
- `npm run demo:check`
- `npm run test:e2e` - 16 passed after the localhost/dev-origin fix
- `npx playwright test tests/e2e/full-role-login-qa.spec.ts`
- `npx playwright test tests/e2e/full-agentgate-ecommerce-integration-qa.spec.ts`
- `npm run verify:commerce-checkout-agent`
- `npm run commerce:reset`
- `npm run verify:commerce-checkout-agent`
- `npm run verify:commerce-agent`
- `npm run verify:agent-integration`
- `rg` scans for local demo API keys in client-visible or committed surfaces

## Passed

- Root install, Prisma generate, unit tests, type-check, lint, and production build.
- Commerce install, tests, and build.
- Demo reset and demo state check after Docker Postgres was started.
- Role login smoke tests for owner, security admin, developer, reviewer, auditor, and platform owner.
- Unauthenticated protected route redirects to login.
- Northstar customer checkout and order tracking journey.
- Northstar admin fulfillment update reflected in customer tracking.
- Northstar customer cannot access admin routes without admin login.
- Northstar chat cancellation flow creates a real AgentGate `REQUIRE_APPROVAL` action.
- Northstar chat destructive customer-delete request is blocked or safely refused.
- Northstar admin API page displays key prefix/config state but not a full key value.
- AgentGate ecommerce monitor shows commerce agent actions, blocked actions, approvals, and audit logs.

## Failed

- `verify:agent-integration` failed immediately after a clean reset because it expects the support-agent scenario chain to have been run first. After running the documented scenario chain, it passed.
- `verify:commerce-agent` failed when run after another commerce verifier because the earlier verifier created an order and the second verifier expected a clean store.

## Screenshots

Representative screenshots are in `docs/qa/screenshots/`.

The larger visual evidence sets remain in:

- `docs/screenshots/`
- `docs/screenshots/ui-polish/`
- `apps/demo-commerce-store/docs/screenshots/`

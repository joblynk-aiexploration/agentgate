# Test Matrix

## Static and Build Checks

| Area | Command | Result | Notes |
| --- | --- | --- | --- |
| Install | `npm install` | PASS | Root install completed; audit showed 5 moderate vulnerabilities. |
| Prisma | `npx prisma generate` | PASS | Prisma client generated. |
| Unit tests | `npm run test` | PASS | 6 files, 28 tests. |
| TypeScript | `npm run type-check` | PASS | No type errors. |
| Lint | `npm run lint` | PASS | No lint errors. |
| AgentGate build | `npm run build` | PASS | Next production build completed. |
| Commerce build | `npm run commerce:build` | PASS | Build completed with workspace-root warning. |
| Commerce unit tests | `npm run commerce:test` | PASS | 14 tests. |

## Browser E2E

| Area | Test | Result |
| --- | --- | --- |
| Public demo pages | `demo-flow.spec.ts` | PASS |
| Visual screenshots | `demo-screenshots.spec.ts`, `northstar-screenshots.spec.ts`, `ui-polish-screenshots.spec.ts` | PASS |
| AgentGate role login | `full-role-login-qa.spec.ts`, `qa-all-agentgate-accounts.spec.ts` | PASS |
| AgentGate pages | `qa-agentgate-pages.spec.ts` | PASS |
| Reviewer approval flow | `approval-flow.spec.ts`, `qa-agentgate-core-flows.spec.ts` | PASS |
| Commerce bridge | `demo-commerce-api-key-bridge.spec.ts` | PASS |
| Customer checkout agent | `customer-checkout-agentgate-flow.spec.ts` | PASS |
| Full AgentGate-commerce flow | `full-agentgate-ecommerce-integration-qa.spec.ts`, `qa-full-agentgate-commerce-integration.spec.ts` | PASS |
| Commerce accounts | `qa-commerce-accounts.spec.ts` | PASS |
| Commerce admin operations | `qa-admin-operations.spec.ts` | PASS |
| Commerce chat | `qa-commerce-agent-chat.spec.ts` | PASS |
| Commerce checkout | `qa-full-customer-checkout.spec.ts` | PASS |

## Scripted Integration

| Area | Command | Result | Notes |
| --- | --- | --- | --- |
| Demo state | `npm run demo:check` | PASS | Clean Acme demo state verified. |
| Support agent | `npm run verify:agent-integration` | PASS | Run after scenario setup chain. |
| Commerce checkout verifier | `npm run verify:commerce-checkout-agent` | PASS | Run after `commerce:reset`. |
| Commerce integration verifier | `npm run verify:commerce-agent` | PASS | Run after `commerce:reset`. |

## Manual Browser Equivalent Coverage

All major browser actions were exercised through Playwright against real local servers, not through mocked component tests.

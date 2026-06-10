# Security QA Report

## Passed Checks

- No paid AI APIs were used.
- No real Stripe, Gmail, Slack, Postgres business writes, carrier calls, or external webhook deliveries were triggered.
- Customer session could not access Northstar admin pages.
- AgentGate protected pages redirected unauthenticated users to login.
- Demo API key UI surfaces showed prefix/config status instead of the full key.
- Destructive customer-delete prompts were blocked or safely refused.
- AgentGate commerce monitor is tenant-scoped to the authenticated organization.

## Findings

### FIXED: Approval UI Persistence Failure

Approval action controls must be reliable because they are security-critical. The issue was traced to local QA using `127.0.0.1`, which blocked Next dev hydration for the client approval button. Local QA now uses `localhost`, and E2E verifies the reviewer approval path.

### MEDIUM: npm Audit Findings

Root dependencies reported 5 moderate vulnerabilities. Commerce dependencies reported 2 moderate vulnerabilities. These should be reviewed in a dependency maintenance pass.

### MEDIUM: Verification Script Isolation

Some verification scripts require a clean state but do not reset their own fixtures. This can create false failures and reduce confidence in security/regression checks.

### FIXED: Dev-Origin Warning

Next.js dev server warned about `127.0.0.1` dev-origin access during QA. The local QA default now uses `localhost`, and the dev configuration allows both `localhost` and `127.0.0.1` websocket/connect origins.

## Secret Scan

Searches for full local demo keys found expected local-only mentions in docs, tests, seed/scripts, and server-side demo configuration. Direct screenshot binary scans did not find the full seeded support or commerce demo keys.

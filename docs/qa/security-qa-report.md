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

### HIGH: Approval UI Persistence Failure

Approval action controls must be reliable because they are security-critical. The UI currently appears clickable but does not persist approval state in multiple E2E flows.

### MEDIUM: npm Audit Findings

Root dependencies reported 5 moderate vulnerabilities. Commerce dependencies reported 2 moderate vulnerabilities. These should be reviewed in a dependency maintenance pass.

### MEDIUM: Verification Script Isolation

Some verification scripts require a clean state but do not reset their own fixtures. This can create false failures and reduce confidence in security/regression checks.

### LOW: Dev-Origin Warning

Next.js dev server warned about `127.0.0.1` dev-origin access. Prefer one canonical local host or configure allowed dev origins.

## Secret Scan

Searches for full local demo keys found expected local-only mentions in docs, tests, seed/scripts, and server-side demo configuration. Direct screenshot binary scans did not find the full seeded support or commerce demo keys.

# Security Findings

## Summary

No critical security blockers were found in this QA pass. The tested demo behavior preserves the core safety model: API keys are for agents, human sessions use login cookies, risky actions route through AgentGate, blocked actions do not execute, and reviewer approval is server-mediated.

## Tested

- Human login for all seeded roles.
- Protected route redirect for unauthenticated users.
- Reviewer can approve eligible approval through the real UI/API.
- Auditor and developer cannot approve approval requests in the tested browser flow.
- Commerce customer cannot access admin pages.
- Commerce admin API config displays key prefix/status, not the full key.
- Public commerce pages and admin logs do not expose the full local demo key.
- Agent transcripts do not contain the full support demo key.
- Screenshots were checked for demo-key strings.
- Agent pause and organization kill switch both return `BLOCK`.
- Deleted/customer-email requests do not expose data or perform deletion.

## Secret Scan Notes

The seeded demo keys are intentionally documented for local-only demo use in README/scripts/tests/seed paths. QA evidence logs were redacted before commit. Screenshots did not contain the full demo key values.

## Remaining Security Work

- Review moderate dependency advisories.
- Add more negative API tests for invalid, expired, revoked, and wrong-organization keys.
- Move any long-lived demo seed key behavior behind an explicit demo-mode flag before production.
- Use distributed rate limiting and production-grade audit retention outside local V1.

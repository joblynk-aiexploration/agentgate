# AgentGate Manual QA Checklist

Use this checklist when browser automation is unavailable or when doing a live
demo rehearsal. The flow proves the real approval UI and API path, not the local
`demo:approve-latest` helper.

## Setup

1. Start Postgres.
2. Run `npm run demo:reset`.
3. Run `npm run demo:check`.
4. Start the app with `npm run dev`.
5. Open `http://localhost:3000`.

## Real Approval Flow

1. Log in as `owner@agentgate.dev` / `Password123!`.
2. Open `/developer/agent-lab`.
3. Run the `large-refund` scenario.
4. Confirm the decision is `REQUIRE_APPROVAL`.
5. Copy or note the `actionRequestId` and `approvalRequestId`.
6. Open `/approvals`.
7. Confirm the new approval appears in the Approval Inbox.
8. Log out.
9. Log in as `auditor@agentgate.dev` / `Password123!`.
10. Open the approval detail page.
11. Confirm the auditor can view the approval but the Approve button is disabled.
12. Log out.
13. Log in as `developer@agentgate.dev` / `Password123!`.
14. Confirm the developer cannot approve the approval.
15. Log out.
16. Log in as `reviewer@agentgate.dev` / `Password123!`.
17. Open the approval detail page.
18. Add a review comment.
19. Click Approve.
20. Confirm the approval status changes to `APPROVED`.
21. Open the linked action detail page.
22. Confirm the action status is `APPROVED`.

## Execute After Approval

Run the safe demo execute call after approval:

```bash
curl -X POST http://localhost:3000/api/gateway/execute \
  -H "Authorization: Bearer ag_test_seed_support_refund_demo_key" \
  -H "Content-Type: application/json" \
  -d '{"actionRequestId":"REPLACE_WITH_ACTION_REQUEST_ID"}'
```

Expected result:

- `executed` is `true`.
- `status` is `EXECUTED`.
- The execution result is simulated.
- No real refund, email, Slack message, webhook, or database write occurs.

## Audit Log Checks

1. Open `/audit-logs`.
2. Confirm `approval.approved` appears for the action.
3. Confirm `gateway.action_executed` appears after the execute call.
4. Confirm metadata does not expose a full API key.

## Notes

- The local-only seeded demo key is for demo verification only.
- Do not use `scripts/approve-latest-demo-approval.ts` as proof of the
  production approval UI. It is useful for CLI demos, but this checklist uses
  the real browser/API approval path.

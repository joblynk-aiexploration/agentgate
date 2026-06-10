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

This flow specifically protects against the historical approval persistence bug:
the approval detail page must send the real approve request, update both approval
and action state to `APPROVED`, and write an `approval.approved` audit log.

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

## Ecommerce Agent API Key Bridge

This checklist proves the Northstar ecommerce support agent can use an
AgentGate-created API key without exposing the full key after setup.

1. Start AgentGate on `http://localhost:3001`.
2. Start Northstar on `http://localhost:3004`.
3. Log in to AgentGate as `owner@agentgate.dev` / `Password123!`.
4. Open `/developer/api-keys`.
5. Create `Northstar Commerce Test Key` scoped to `Demo Commerce Support Agent`.
6. Copy the one-time full key.
7. Refresh `/developer/api-keys` and confirm the full key is gone while the prefix remains.
8. Open `http://localhost:3004/admin/login`.
9. Log in with `admin@northstar-demo.dev` / `Password123!`.
10. Open `http://localhost:3004/admin/api`.
11. Save Base URL `http://localhost:3001`, Agent ID `demo-commerce-support-agent`, and the copied key.
12. Refresh and confirm only an `ag_test_...` prefix appears.
13. Click `Test connection`.
14. Open `http://localhost:3004/login`.
15. Log in as `customer@northstar-demo.dev` / `Password123!`.
16. Confirm `/account/orders` starts empty after `npm run commerce:reset`.
17. Add SummitPro Backpack and AlpineShell Jacket to cart.
18. Complete demo checkout and copy the generated `NS-XXXX` order number.
19. Open `/account`, `/account/orders`, `/account/orders/<orderNumber>`, `/account/tracking`, and `/account/receipts`.
20. Confirm the customer portal shows dashboard metrics, the real checkout order, tracking timeline, and receipt preview.
21. Open the chat widget and ask `What backpacks do you sell?`.
22. Confirm the answer comes from the local catalog.
23. Ask `Where is my latest order?`.
24. Confirm the assistant finds the checkout-created order.
25. Ask `Cancel my latest order.`.
26. Confirm the customer sees an approval-needed response.
27. Open `/integrations/demo-commerce` and confirm the `REQUIRE_APPROVAL` action appears.
28. Open `/approvals` and confirm the pending approval appears.
29. Ask `Please resend my receipt for my latest order.`.
30. Confirm no real email is sent and AgentGate records the decision.
31. Ask `Delete my customer record.`.
32. Confirm no customer data is deleted and the request is blocked or safely refused.
33. Open Northstar admin `/admin`, `/admin/orders`, `/admin/orders/<orderNumber>`, `/admin/fulfillment`, `/admin/tracking`, `/admin/api`, and `/admin/agent-logs`.
34. Confirm admin sees metrics, order detail, tracking events, fulfillment controls, safe API key prefix, and agent activity.
35. Open AgentGate `/audit-logs` and confirm gateway checks, approval requests, and blocked actions are recorded.
36. Log out of AgentGate, then log in as `reviewer@agentgate.dev` / `Password123!`.
37. Open the pending `order.cancel` approval and approve it with a review comment.
38. Confirm the approval and related action request both show `APPROVED`.
39. Return to Northstar admin at `http://localhost:3004/admin/orders`.
40. Click `Sync approved AgentGate actions`.
41. Confirm the checkout-created order changes to `Cancelled`.
42. Open AgentGate `/actions` and confirm the cancellation action shows `EXECUTED`.
43. Open AgentGate `/audit-logs` and confirm `approval.approved` and `gateway.action_executed` are present.

## Notes

- The local-only seeded demo key is for demo verification only.
- The admin sync executes only approved `order.cancel` requests through the safe demo executor. Receipt/email approvals do not cancel an order.
- Do not use `scripts/approve-latest-demo-approval.ts` as proof of the
  production approval UI. It is useful for CLI demos, but this checklist uses
  the real browser/API approval path.

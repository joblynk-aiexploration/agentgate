# Northstar Ecommerce Tests

## Customer Flow

- Customer can log in.
- Customer can browse products and product detail pages.
- Customer can add item to cart.
- Customer can complete simulated checkout.
- Customer can view checkout success, account, order history, tracking, receipts, and support.

## Admin Flow

- Admin can log in.
- Admin dashboard loads.
- Orders, order detail, products, customers, API config, agent logs, fulfillment, tracking, and settings pages load.
- Customer user is redirected away from admin.
- Admin API config is prefix-only and does not expose the full demo key.

## Chat Flow

- Product questions return product information.
- Policy questions return informational copy.
- Unknown order lookup is handled safely.
- Latest order lookup works for logged-in customer.
- Cancellation request routes through AgentGate and returns `REQUIRE_APPROVAL`.
- Receipt resend routes through AgentGate.
- Customer record delete is blocked/refused.
- Full API key request does not expose the key.
- Customer email listing request returns explicit privacy refusal.

## Evidence

- `tests/e2e/qa-commerce-accounts.spec.ts`
- `tests/e2e/qa-full-customer-checkout.spec.ts`
- `tests/e2e/qa-admin-operations.spec.ts`
- `tests/e2e/qa-commerce-agent-chat.spec.ts`
- `npm run commerce:test`

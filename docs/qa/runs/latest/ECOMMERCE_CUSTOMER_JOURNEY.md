# Ecommerce Customer Journey

## Tested Path

1. Customer logs in.
2. Customer opens products.
3. Customer opens product detail.
4. Customer adds product to cart.
5. Customer checks out with local demo card details.
6. Checkout success shows a local order number.
7. Customer views account dashboard.
8. Customer views order history.
9. Customer views order detail and tracking timeline.
10. Customer uses chat for product, order, cancellation, receipt, and privacy-sensitive requests.

## Result

PASS. The journey feels like a real commerce support scenario while preserving demo-only behavior.

## Important Boundaries

- No real payment is charged.
- No real email is sent.
- No real external fulfillment or carrier system is called.
- Risky agent actions are routed through AgentGate.

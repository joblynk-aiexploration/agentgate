# Ecommerce Agent Chat

## Tested Intents

- Product question.
- Product category question.
- Return policy question.
- Unknown order lookup.
- Latest order lookup.
- Cancel latest order.
- Resend receipt.
- Delete customer record.
- Reveal API key request.
- Show all customer emails request.

## Result

PASS after two fixes:

- Return policy questions now route to policy answers instead of return requests.
- Customer email/private data requests now return explicit privacy refusal.

## AgentGate Boundary

The chat agent does not directly mutate risky order state. Cancellation and receipt resend are checked through AgentGate first. Customer deletion is blocked/refused.

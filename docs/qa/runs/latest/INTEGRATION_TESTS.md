# Integration Tests

## AgentGate Support Operations Agent

The support-agent scenario chain verified:

- Refund action creates ActionRequest.
- Large refund creates ApprovalRequest.
- Delete action blocks.
- Reviewer approval enables safe simulated execution.
- Paused agent blocks.
- Organization kill switch blocks.
- Audit logs and transcripts exist.
- Transcripts do not contain the full demo API key.

Result: PASS.

## Northstar Commerce Agent

The commerce integration verified:

- Commerce admin can save/test AgentGate config.
- Checkout-created order can be found by chat agent.
- Cancellation request creates AgentGate approval.
- Reviewer approval is synced back to Northstar.
- Order becomes cancelled only after approval/sync.
- Agent logs and AgentGate audit logs show the path.
- Delete/customer-data request is blocked/refused.

Result: PASS.

## Evidence

- `support-agent-verifier.log`
- `e2e-rerun.log`
- `final-source-checks-after-fixes.log`

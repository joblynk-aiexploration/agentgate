# Ecommerce Account Access Report

## Customer Access

Customer login, checkout, account, order detail, and tracking flows were tested through Playwright. Customer pages showed useful account and order state.

## Admin Access

Admin login and admin pages were tested through Playwright and commerce verifiers. Customer sessions could not open admin pages directly.

## AgentGate API Configuration

The Northstar admin API page shows configuration status and key prefix only. The full seeded local demo key did not appear in the UI during automated checks.

## Finding

Commerce verifier scripts are stateful. If one verifier creates an order and another verifier expects an empty store, the second verifier fails unless `npm run commerce:reset` is run between them.


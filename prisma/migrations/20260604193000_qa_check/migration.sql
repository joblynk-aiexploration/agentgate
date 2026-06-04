-- Scope gateway idempotency to the authenticated API key so one key cannot
-- replay another key's response inside the same organization.
DROP INDEX IF EXISTS "ActionRequest_organizationId_idempotencyKey_key";

CREATE UNIQUE INDEX "ActionRequest_organizationId_apiKeyId_idempotencyKey_key"
ON "ActionRequest"("organizationId", "apiKeyId", "idempotencyKey");

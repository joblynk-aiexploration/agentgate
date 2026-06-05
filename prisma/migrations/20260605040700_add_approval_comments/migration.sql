CREATE TABLE "ApprovalComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApprovalComment_organizationId_approvalRequestId_createdAt_idx" ON "ApprovalComment"("organizationId", "approvalRequestId", "createdAt");

CREATE INDEX "ApprovalComment_authorUserId_idx" ON "ApprovalComment"("authorUserId");

ALTER TABLE "ApprovalComment" ADD CONSTRAINT "ApprovalComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApprovalComment" ADD CONSTRAINT "ApprovalComment_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApprovalComment" ADD CONSTRAINT "ApprovalComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function AuditLogsPage() {
  return (
    <ProtectedPage
      title="Audit Logs"
      description="Inspect immutable security events for gateway checks, authentication, approvals, and policy changes."
    />
  );
}

import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function ApprovalsPage() {
  return (
    <ProtectedPage
      title="Approvals"
      description="Review pending action requests assigned to you or eligible for your organization role."
    />
  );
}

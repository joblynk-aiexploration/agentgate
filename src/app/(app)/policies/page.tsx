import { ProtectedPage } from "@/app/(app)/_components/protected-page";

export default function PoliciesPage() {
  return (
    <ProtectedPage
      title="Policies"
      description="Configure deterministic local rules for risk decisions, approvals, blocks, and audit-only actions."
    />
  );
}
